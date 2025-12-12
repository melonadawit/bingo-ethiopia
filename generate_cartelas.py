from gtts import gTTS
import os
import time

# Create directory if not exists
output_dir = "client/public/audio/cartelas"
os.makedirs(output_dir, exist_ok=True)

print("Starting generation of 300 Amharic audio files...")

for i in range(1, 301):
    # Text: "The winner cartela number is {i}" in Amharic
    # Amharic: "አሸናፊው ካርቴላ ቁጥር {i} ነው"
    text = f"አሸናፊው ካርቴላ ቁጥር {i} ነው"
    
    # Generate audio
    try:
        tts = gTTS(text=text, lang='am')
        filename = f"{output_dir}/{i}.mp3"
        tts.save(filename)
        
        if i % 10 == 0:
            print(f"Generated {i}/300")
            
        # Sleep briefly to avoid rate limiting
        time.sleep(0.2)
        
    except Exception as e:
        print(f"Error generating {i}: {e}")
        time.sleep(2)

print("Generation complete!")
