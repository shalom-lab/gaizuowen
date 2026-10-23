from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent/'final'
for k in ['teacher','parent']:
 a=p/f'{k}-0.mp3'
 d=float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',str(a)]))+0.4
 subprocess.run(['ffmpeg','-y','-i',str(p/f'{k}-final.mp4'),'-loop','1','-i',str(p/f'{k}-cover-v3.png'),'-filter_complex',f'[1:v]scale=1080:1920[cover];[0:v][cover]overlay=0:0:enable=lt(t\\,{d}):shortest=1[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','fast','-crf','21','-c:a','copy','-movflags','+faststart',str(p/f'{k}-final-v3.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 print(k,flush=True)

