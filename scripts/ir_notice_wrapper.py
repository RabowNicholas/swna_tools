#!/usr/bin/env python3
"""
IR Notice La Plata Generator wrapper for Next.js integration.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.base_wrapper import handle_generator_execution
from generators.ir_notice_la_plata_generator import IRNoticeLaPlataGenerator

if __name__ == "__main__":
    handle_generator_execution(IRNoticeLaPlataGenerator)