import sys, asyncio, subprocess, json, math, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'.deps'))
import edge_tts
OUT=ROOT/'final'; OUT.mkdir(exist_ok=True)
font='C:/Windows/Fonts/msyh.ttc'
def card(path, lines, tag, footer):
 im=Image.new('RGB',(1080,1920),'#fff7ed');d=ImageDraw.Draw(im)
 d.rounded_rectangle((65,120,1015,250),40,fill='#e11d48');d.text((100,150),tag,font=ImageFont.truetype(font,48),fill='white')
 y=390
 for line in lines:
  d.text((75,y),line,font=ImageFont.truetype(font,86),fill='#172033');y+=145
 d.rounded_rectangle((65,1100,1015,1610),45,fill='white')
 for i,line in enumerate(footer):d.text((105,1160+i*100),line,font=ImageFont.truetype(font,44),fill='#475569')
 d.text((75,1770),'作文批改助手  /  gzw.rlearner.com',font=ImageFont.truetype(font,36),fill='#e11d48');im.save(path)
variants={
 'teacher':('给小学语文老师',['作文一摞摞，','批注怎么写？'],['拍照上传 · 逐段看批注','真实界面操作演示','AI 辅助，老师核对']),
 'parent':('给陪孩子写作文的家长',['孩子作文，','怎么改才明白？'],['看懂问题 · 陪孩子修改','让建议落到具体句子','辅助修改，不代写作文'])}
texts={
 'teacher':['作文一摞摞，批注怎么写？','试试作文批改助手。打开网页，上传作文照片。','多页作文按顺序添加。这里展示真实照片上传。','接着打开内置示例，看看批注效果。','原文和修改建议放在一起，逐段查看，方便老师核对。','还可以导出批注文档，留作参考。','打开屏幕上的网址。需要自备接口密钥，模型调用另行计费。'],
 'parent':['孩子作文，怎么改才明白？','试试作文批改助手，陪孩子一起看懂问题。','拍下作文并上传，多页可以按顺序添加。','现在打开内置示例，看看修改建议。','哪里用词不当，哪句值得保留，结合原文一起讨论。','批注可以导出，方便之后回看。','打开屏幕上的网址。需要自备接口密钥，建议由家长核对。']}
def run(args):subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def duration(p):return float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0',str(p)]))
def stamp(t):return f'{int(t)//3600:02}:{int(t)//60%60:02}:{int(t)%60:02},{int(t%1*1000):03}'
async def main():
 for key,(tag,lines,footer) in variants.items():
  card(OUT/f'{key}-cover.png',lines,tag,footer)
  card(OUT/f'{key}-end.png',['拍作文，看批注','打开网页试试看'],tag,['gzw.rlearner.com','需自备 DeepSeek API Key','模型按服务商规则计费'])
  clips=[];subs=[];elapsed=0
  for i,txt in enumerate(texts[key]):
   audio=OUT/f'{key}-{i}.mp3';await edge_tts.Communicate(txt,'zh-CN-XiaoxiaoNeural',rate='-3%').save(str(audio))
   dur=duration(audio)+0.4
   subs.append(f'{i+1}\n{stamp(elapsed)} --> {stamp(elapsed+dur)}\n{txt}\n');elapsed+=dur
   source=OUT/f'{key}-cover.png' if i==0 else OUT/f'{key}-end.png' if i==6 else ROOT/'screenshots'/['01-home.png','02-upload.png','02-history.png','03-result.png','05-export.png'][i-1]
   target=OUT/f'{key}-part{i}.mp4'
   run(['ffmpeg','-y','-loop','1','-i',str(source),'-i',str(audio),'-t',str(dur),'-vf','scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white','-r','25','-c:v','libx264','-preset','fast','-pix_fmt','yuv420p','-c:a','aac',str(target)]);clips.append(target)
  (OUT/f'{key}.srt').write_text('\n'.join(subs),encoding='utf-8')
  listing=OUT/f'{key}-list.txt';listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in clips))
  run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(OUT/f'{key}-voice.mp4')])
  # Original synthesized soft instrumental bed: slow C / Am / F / G arpeggios.
  sr=44100;t=np.arange(int((elapsed+1)*sr))/sr;music=np.zeros_like(t)
  chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]]
  for beat in range(int(elapsed*2)+1):
   start=beat*.5;u=t-start;mask=(u>=0)&(u<2);f=chords[(beat//8)%4][beat%3];music[mask]+=.09*np.sin(2*np.pi*f*u[mask])*np.exp(-u[mask]*3)*np.minimum(u[mask]*40,1)
  with wave.open(str(OUT/f'{key}-music.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(music,-1,1)*32767).astype(np.int16).tobytes())
  run(['ffmpeg','-y','-i',str(OUT/f'{key}-voice.mp4'),'-i',str(OUT/f'{key}-music.wav'),'-filter_complex',f"[0:v]subtitles={key}.srt:force_style='FontName=Microsoft YaHei,FontSize=14,MarginV=30,Outline=2'[v];[0:a]volume=1.5[a];[1:a]volume=0.3[b];[a][b]amix=inputs=2:duration=first:normalize=0[m]",'-map','[v]','-map','[m]','-c:v','libx264','-preset','fast','-crf','21','-c:a','aac','-movflags','+faststart',str(OUT/f'{key}-final.mp4')])
  print(key,'finished',elapsed,flush=True)
import os
os.chdir(OUT)
asyncio.run(main())
