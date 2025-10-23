#!/usr/bin/env python3
"""
EE-1a Generator wrapper for Next.js integration.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.base_wrapper import handle_generator_execution
from generators.ee1a_generator import EE1AGenerator

if __name__ == "__main__":
    handle_generator_execution(EE1AGenerator)