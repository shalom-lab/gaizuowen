from pathlib import Path
import subprocess,os
p=Path(__file__).resolve().parent/'final';os.chdir(p)
for key in ['teacher','parent']:
 s=Path(key+'.srt').read_text(encoding='utf8');out=[]
 for line in s.splitlines():
  if '-->' not in line and line and not line.isdigit():line='\n'.join(line[i:i+16] for i in range(0,len(line),16))
  out.append(line)
 Path(key+'.srt').write_text('\n'.join(out),encoding='utf8')
 subprocess.run(['ffmpeg','-y','-i',key+'-voice.mp4','-i',key+'-music.wav','-filter_complex',f"[0:v]subtitles={key}.srt:force_style='FontName=Microsoft YaHei,FontSize=8,MarginV=20,Outline=1,Alignment=2'[v];[0:a]volume=1.5[a];[1:a]volume=0.3[b];[a][b]amix=inputs=2:duration=first:normalize=0[m]",'-map','[v]','-map','[m]','-c:v','libx264','-preset','fast','-crf','21','-c:a','aac','-movflags','+faststart',key+'-final.mp4'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 print(key,flush=True)
