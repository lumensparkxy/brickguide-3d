# LACK source register and instructional boundaries

Inspected 2026-10-25 by an AI agent. This is not a human review or physical build.

Product: [IKEA Switzerland LACK, white, 55 × 55 cm, 304.499.08](https://www.ikea.com/ch/en/p/lack-side-table-white-30449908/).
The product page confirms overall width/length 550 mm and height 450 mm. It links all
three documents below. Assembly evidence comes from the booklets; product metadata
supplies identity and overall size, not hidden joinery or an assembly sequence.

| Document | Role | Pages | Actual SHA-256 |
|---|---|---:|---|
| AA-2606170-1 (2025) | Primary assembly and warnings | 4 | `f99e580ebfb936f144f4fbc8ec2d55bd126ff7b71dcea5487318285c0f89b3de` |
| AA-207276-4 (2006) | Earlier assembly edition, retained separately | 1 | `5f8ae60c8e7ac6707df08bcc49b2a5322839153f40c317948d70ab9e5f446025` |
| AA-2205802-3 (2021) | Care instructions | 1 | `83a707fcef7cf10bc1417cbb82d638372188f8f0cda7137ca009de9001cc8545` |

Official URLs:

- https://www.ikea.com/ch/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf
- https://www.ikea.com/ch/en/assembly_instructions/lack-side-table-white__AA-207276-4-1.pdf
- https://www.ikea.com/ch/en/manuals/lack-side-table-white__AA-2205802-3-2.pdf

## Coverage and review criteria

Page numbers in this table are human-facing, one-based. API page indices are zero-based.

| Evidence | Required tutorial behavior |
|---|---|
| Primary page 1: 4× double-ended screw 115980 | Identify the hardware and quantity; do not invent IDs for the tabletop or legs. |
| Primary page 1: hand inserting screw into tabletop | Explain this action before leg attachment; no numeric insertion-depth or torque claim. |
| Primary page 1: rotating leg onto exposed screw | Explain the attachment and repetition for four legs; do not invent a number of turns. |
| Primary page 1: protected surface vs damage pictogram | Prepare a soft/protective surface and preserve that context during assembly. |
| Primary page 2: English warnings | Keep the prohibition on sitting and maximum load of 10 kg visible. |
| Primary pages 3–4: translated warnings | Preserve the complete original PDF; English is the pilot language, not a claim of translation review. |
| Care page 1: English care | Damp cloth, clean dry cloth, and regular fastening checks/retightening when necessary. |

The booklet has an unnumbered repeated assembly diagram, not five printed assembly
steps. Portal steps are authored explanatory subdivisions, not new manufacturer steps.
The old edition depicts the same attachment and surface-protection actions with a
different pictogram layout. It is an alternate source, not another stage to perform.

## Geometry and completeness limits

Four legs, one tabletop and four fasteners are represented. Overall product dimensions
are documented; panel thickness, leg cross-section, hole offsets, screw length, thread
pitch and exact engagement depth are not established by these sources. Instructional
3D uses labelled schematic shapes, highlighting and an authored connection animation.
The animation illustrates screw insertion followed by turning a leg onto that screw.
Its rotations, timing, thread pitch and travel distances are presentation choices, not
manufacturer-specified measurements. The close-up shows a partial leg for visibility;
it is not a shortened real part. Leg instance numbers are assistant labels; 115980 is
the official screw number. It is not a measured CAD
model, a collision/connector certification or a demonstration of physical strength.

Source screenshots are in ignored `var/evidence/furniture/`: `assembly.png`,
`supplement.png`, `warnings.png`, `care.png`. Their downloaded PDF hashes/page counts
are recorded in `source-inspection.json`. Full original notices remain in the PDFs.
No finished community model or tutorial video supplied assembly evidence.

The full-table animation repeats that same connection at four corners. Corner order
is an assistant choice because the booklet does not number the corners. Persistent
instance labels do not imply manufacturer part numbers. Upright orientation is an
explicit final view, not an instruction about lifting or turning over the furniture.

## Additional Swiss finishes (2026-10-25)

- Black-brown 801.042.68: https://www.ikea.com/ch/en/p/lack-side-table-black-brown-80104268/
- White stained oak effect 703.190.28: https://www.ikea.com/ch/en/p/lack-side-table-white-stained-oak-effect-70319028/

The exact linked assembly PDFs were downloaded and match AA-207276-4 bytes already
reviewed for the original pilot. Black-brown additionally links the same AA-2205802-3
care bytes. Oak care is sourced from its product page, not the white care booklet.
See FINISHES.md and `var/evidence/furniture-finishes/source-review.json` for hashes,
review observations, article-specific warnings and limits. Both additions remain
agent source-checked; human review and physical assembly are not_run.
