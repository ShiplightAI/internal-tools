#!/usr/bin/env python3
"""Exercise the composite action's real Generate shell with a fake generator."""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import textwrap
import unittest


ACTION = Path(__file__).resolve().parents[1] / "release-notes/action.yml"


class ActionOutputTests(unittest.TestCase):
    def test_output_path_is_data_not_shell_code(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            action = root / "action"
            action.mkdir()
            (action / "run-release-notes.sh").write_text(
                '#!/bin/bash\nprintf "Example release notes.\\n" > "$NOTES_FILE"\n'
            )
            # A valid filename containing shell substitutions.
            notes = root / 'notes-$(touch INJECTED)-`touch ALSO_INJECTED`.md'
            output = root / "output"
            source = ACTION.read_text().split("    - name: Generate\n", 1)[1]
            script = textwrap.dedent(source.split("      run: |\n", 1)[1])
            values = {"inputs.output-file": str(notes), "github.action_path": str(action)}
            script = re.sub(r"\$\{\{\s*(.*?)\s*\}\}",
                            lambda match: values[match.group(1)], script)
            environment = dict(os.environ, NOTES_FILE=str(notes),
                               GITHUB_ACTION_PATH=str(action), GITHUB_OUTPUT=str(output))
            result = subprocess.run(["bash", "-c", script], cwd=root,
                                    env=environment, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((root / "INJECTED").exists())
            self.assertFalse((root / "ALSO_INJECTED").exists())
            self.assertEqual(output.read_text(), f"notes-file={notes}\ngenerated=true\n")


if __name__ == "__main__":
    unittest.main()
