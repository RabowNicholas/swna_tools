#!/usr/bin/env python3
"""
Coordinate Helper Script
Creates overlay grids on PDF templates to help identify exact coordinates for field placement.
"""

import os
import sys
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def create_coordinate_grid(template_path, output_path):
    """Create a PDF with coordinate grid overlay for easier positioning"""
    
    try:
        # Load the existing PDF
        base_pdf = PdfReader(template_path)
        base_page = base_pdf.pages[0]

        # Create overlay with grid
        overlay_buffer = BytesIO()
        overlay = canvas.Canvas(overlay_buffer, pagesize=letter)
        
        # Set up grid parameters
        width, height = letter  # 612, 792
        grid_size = 50
        
        # Draw vertical lines and labels
        overlay.setStrokeColorRGB(0.8, 0.8, 0.8)  # Light gray
        overlay.setFont("Helvetica", 8)
        
        for x in range(0, int(width), grid_size):
            overlay.line(x, 0, x, height)
            # Add X coordinate labels
            overlay.drawString(x + 2, height - 15, str(x))
            if x > 0:  # Don't draw at 0 to avoid clutter
                overlay.drawString(x + 2, 20, str(x))
        
        # Draw horizontal lines and labels
        for y in range(0, int(height), grid_size):
            overlay.line(0, y, width, y)
            # Add Y coordinate labels
            overlay.drawString(5, y + 2, str(y))
            if y < height - 30:  # Don't draw too close to top
                overlay.drawString(width - 30, y + 2, str(y))
        
        # Add corner markers with coordinates
        overlay.setStrokeColorRGB(1, 0, 0)  # Red
        overlay.setFillColorRGB(1, 0, 0)  # Red
        overlay.setFont("Helvetica-Bold", 10)
        
        # Corner markers
        corner_size = 10
        corners = [
            (0, 0, "0,0"),
            (width, 0, f"{int(width)},0"),
            (0, height, f"0,{int(height)}"),
            (width, height, f"{int(width)},{int(height)}")
        ]
        
        for x, y, label in corners:
            overlay.circle(x, y, corner_size, fill=1)
            # Offset label so it's visible
            label_x = x + 15 if x < width/2 else x - 50
            label_y = y + 15 if y < height/2 else y - 20
            overlay.drawString(label_x, label_y, label)
        
        # Add title and instructions
        overlay.setFillColorRGB(0, 0, 0)  # Black
        overlay.setFont("Helvetica-Bold", 12)
        overlay.drawString(width/2 - 100, height - 30, "COORDINATE REFERENCE GRID")
        
        overlay.setFont("Helvetica", 10)
        instructions = [
            "Grid lines every 50 units",
            "Red circles mark corners",
            "Numbers show X,Y coordinates",
            "Use these coordinates in your generator files"
        ]
        
        for i, instruction in enumerate(instructions):
            overlay.drawString(50, height - 60 - (i * 15), f"• {instruction}")
        
        overlay.save()
        overlay_buffer.seek(0)

        # Merge overlay onto template
        overlay_pdf = PdfReader(overlay_buffer)
        overlay_page = overlay_pdf.pages[0]

        output = PdfWriter()
        base_page.merge_page(overlay_page)
        output.add_page(base_page)

        # Save result
        with open(output_path, "wb") as output_file:
            output.write(output_file)
        
        return True
        
    except Exception as e:
        print(f"Error creating grid for {template_path}: {e}")
        return False


def main():
    """Create coordinate grids for all template PDFs"""
    print("🎯 PDF Coordinate Helper")
    print("========================")
    print("Creating coordinate reference grids for all templates...\n")
    
    templates_dir = "templates"
    output_dir = "coordinate_grids"
    
    # Create output directory
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Created {output_dir} directory")
    
    # Templates to process
    templates = [
        ("EE-1.pdf", "EE-1_with_grid.pdf"),
        ("EE-1a.pdf", "EE-1a_with_grid.pdf"),
        ("EE-3.pdf", "EE-3_with_grid.pdf")
    ]
    
    results = []
    
    for template_name, output_name in templates:
        template_path = os.path.join(templates_dir, template_name)
        output_path = os.path.join(output_dir, output_name)
        
        print(f"Processing {template_name}...")
        
        if not os.path.exists(template_path):
            print(f"   ❌ Template not found: {template_path}")
            results.append((template_name, False))
            continue
        
        success = create_coordinate_grid(template_path, output_path)
        
        if success:
            print(f"   ✅ Grid created: {output_path}")
            results.append((template_name, True))
        else:
            print(f"   ❌ Failed to create grid")
            results.append((template_name, False))
    
    # Summary
    print("\n📊 Grid Creation Results:")
    print("-" * 40)
    
    for template_name, success in results:
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{template_name:12} {status}")
    
    print("\n" + "="*50)
    print("📋 HOW TO USE THE COORDINATE GRIDS:")
    print("="*50)
    print("1. Open the files in coordinate_grids/ folder")
    print("2. Look at where you want to place each field")
    print("3. Note the X,Y coordinates from the grid")
    print("4. Update the coordinates in your generator files:")
    print("   - generators/ee1_generator.py")
    print("   - generators/ee1a_generator.py")
    print("   - generators/ee3_generator.py")
    print("5. Run test_forms.py to test your changes")
    print("\nRemember: PDF coordinates start from BOTTOM-LEFT!")
    print("• Higher Y = further UP on page")
    print("• Higher X = further RIGHT on page")
    print("="*50)


if __name__ == "__main__":
    main()