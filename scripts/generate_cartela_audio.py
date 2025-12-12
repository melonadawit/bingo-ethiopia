#!/usr/bin/env python3
"""
Generate Amharic cartela winner announcements for numbers 1-300
Uses Google Text-to-Speech API
"""

from gtts import gTTS
import os
from pathlib import Path

def generate_cartela_announcements():
    """Generate winner announcements for cartela numbers 1-300"""
    
    # Create output directory
    output_dir = Path("client/public/audio/cartelas")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("🎤 Generating cartela announcements (1-300)...")
    
    # Amharic text template
    # "ያሸነፈው ካርቴላ ቁጥር" = "The winner is cartela number"
    template = "ያሸነፈው ካርቴላ ቁጥር {}"
    
    success_count = 0
    error_count = 0
    
    for num in range(1, 301):
        try:
            # Create the announcement text
            text = template.format(num)
            
            # Generate speech using Google TTS with Amharic
            tts = gTTS(text=text, lang='am', slow=False)
            
            # Save to file
            output_file = output_dir / f"{num}.mp3"
            tts.save(str(output_file))
            
            success_count += 1
            
            # Progress indicator
            if num % 50 == 0:
                print(f"  ✓ Generated {num}/300 files...")
                
        except Exception as e:
            print(f"  ✗ Error generating {num}: {e}")
            error_count += 1
    
    print(f"\n✅ Complete!")
    print(f"   Generated: {success_count} files")
    print(f"   Errors: {error_count} files")
    print(f"   Location: {output_dir}")

if __name__ == "__main__":
    # Check if gtts is installed
    try:
        import gtts
    except ImportError:
        print("❌ gTTS not installed. Installing...")
        os.system("pip install gtts")
        print("✅ gTTS installed. Running script...")
    
    generate_cartela_announcements()
