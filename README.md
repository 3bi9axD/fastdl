# Bi9aCraft V4

Critical mouse interaction rebuild:
- Direct voxel-grid crosshair raycast (not InstancedMesh picking)
- Hold Mouse1 to mine/break
- Mouse2 to place selected building block (slots 4-9)
- Mouse handling captured at document level while pointer-lock is active
- Target HUD shows exact block coordinates for easy verification
- Existing AZERTY/QWERTY controls, persistent Firebase edits, water and caves retained


## V5 mouse fix
- Mouse input is no longer disabled when a PC also has a touchscreen/coarse pointer.
- Pointer lock is attached directly to the WebGL canvas.
- The click used to acquire pointer lock is replayed as the requested mine/place action.
- Mouse1 hold state is tracked globally so mining resumes reliably while held.
