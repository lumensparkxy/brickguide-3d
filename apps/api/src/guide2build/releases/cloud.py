"""Immutable, generation-checked GCS transfers; pointer changes occur only after verification."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from guide2build.releases.packaging import verify_bundle, verify_manifest


class GCSReleases:
    def __init__(self, project, staging_bucket, public_bucket, credentials=None):
        if staging_bucket == public_bucket:
            raise ValueError('Staging and publication buckets must differ')
        from google.cloud import storage
        client = storage.Client(project=project, credentials=credentials)
        self.staging, self.public = client.bucket(staging_bucket), client.bucket(public_bucket)

    @staticmethod
    def checked_bytes(blob, expected):
        blob.reload()
        if blob.size != expected['bytes']:
            raise ValueError('Remote object size mismatch')
        data = blob.download_as_bytes(if_generation_match=blob.generation)
        if hashlib.sha256(data).hexdigest() != expected['sha256']:
            raise ValueError('Remote object hash mismatch')
        return data

    def stage(self, directory: Path):
        manifest = verify_bundle(directory)
        prefix = manifest['release_sha256'] + '/'
        receipts = dict(manifest['files'])
        data = (directory / 'manifest.json').read_bytes()
        receipts['manifest.json'] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        for name, receipt in receipts.items():
            blob = self.staging.blob(prefix + name)
            if not blob.exists():
                blob.upload_from_filename(str(directory / name), if_generation_match=0,
                                          content_type='application/json' if name.endswith('.json') else 'image/png' if name.endswith('.png') else 'text/plain')
            self.checked_bytes(blob, receipt)
        return manifest

    def validate_staged(self, release_hash: str):
        import re
        from guide2build.releases.packaging import validate_scene_manifest
        if not re.fullmatch(r'[a-f0-9]{64}', release_hash):
            raise ValueError('Invalid release identity')
        source = self.staging.blob(release_hash + '/manifest.json')
        source.reload()
        if not source.size or source.size > 32_000_000:
            raise ValueError('Manifest size limit')
        data = source.download_as_bytes(if_generation_match=source.generation)
        manifest = verify_manifest(json.loads(data))
        if manifest['release_sha256'] != release_hash:
            raise ValueError('Release identity mismatch')
        scene_data = {k: v for k, v in manifest.items() if k not in
                      {'reviews', 'step_index', 'chunks', 'files', 'release_sha256', 'preview'}}
        scene_data['steps'] = []
        for chunk in manifest['chunks']:
            raw = self.checked_bytes(self.staging.blob(release_hash + '/' + chunk['path']),
                                     manifest['files'][chunk['path']])
            scene_data['steps'].extend(json.loads(raw)['steps'])
        report = self.checked_bytes(self.staging.blob(release_hash + '/validation.json'),
                                    manifest['files']['validation.json'])
        coverage = self.checked_bytes(self.staging.blob(release_hash + '/coverage.json'),
                                      manifest['files']['coverage.json'])
        validate_scene_manifest(manifest, scene_data['steps'], report, json.loads(coverage))
        return manifest

    def publish(self, release_hash: str, identity):
        identity.require_approver()
        manifest = self.validate_staged(release_hash)
        from guide2build.releases.models import canonical
        data = canonical(manifest)
        receipts = dict(manifest['files'])
        receipts['manifest.json'] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        for name, receipt in receipts.items():
            source = self.staging.blob(release_hash + '/' + name)
            data = self.checked_bytes(source, receipt)
            destination = self.public.blob(release_hash + '/' + name)
            if not destination.exists():
                destination.cache_control = 'public,max-age=31536000,immutable'
                destination.upload_from_string(data, if_generation_match=0,
                    content_type='application/json' if name.endswith('.json') else 'image/png' if name.endswith('.png') else 'text/plain')
            self.checked_bytes(destination, receipt)
        return manifest
