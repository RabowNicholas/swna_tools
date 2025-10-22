#!/usr/bin/env python3
"""
EE-3 Generator wrapper for Next.js integration.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.base_wrapper import handle_generator_execution
from generators.ee3_generator import EE3Generator

if __name__ == "__main__":
    # EE3Generator uses default template path, no special args needed
    handle_generator_execution(EE3Generator)