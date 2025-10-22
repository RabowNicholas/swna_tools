#!/usr/bin/env python3
"""
EE-1 Generator wrapper for Next.js integration.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.base_wrapper import handle_generator_execution
from generators.ee1_generator import EE1Generator

if __name__ == "__main__":
    handle_generator_execution(EE1Generator)