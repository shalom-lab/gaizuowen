# 作文批改助手 · 宣发素材

## 朋友圈 / 教师群
批作文，最费心的是逐句看、逐段写批注。
做了一个「作文批改助手」：拍照上传作文，生成逐段批注和总评；支持多页上传、批改记录和批注文档导出。
老师先核对，再选用合适的建议，保留自己的教学判断。
打开：https://gzw.rlearner.com
需要自行配置 DeepSeek API Key，模型调用按服务商规则计费。

## 小红书标题
给语文老师做了一个作文批改小工具｜拍照上传，逐段看批注

## 正文
这次直接给大家看实际操作。
① 从相册上传作文照片，多页按顺序排列。
② 打开批改记录，查看原文、修改建议和总评。
③ 导出批注文档，方便之后查看。
视频展示真实照片上传与内置示例结果，未展示本次在线生成。AI 建议需要老师核对。
入口：gzw.rlearner.com
#语文老师 #作文批改 #教学工具 #教师日常

## 视频口播
给语文老师做了一个作文批改助手。打开网页，从相册选作文照片，多页也能上传。这里打开内置示例，看看批注效果：原文配合修改建议，逐段查看。最后还可以导出批注文档。使用时需要配置自己的 DeepSeek API Key，批注记得由老师核对。

## 最终素材
- 教师版：final/teacher-final-v3.mp4，约 37 秒；封面：final/teacher-cover-v3.png。
- 家长版：final/parent-final-v3.mp4，约 33 秒；封面：final/parent-cover-v3.png。
- 成片均为 1080×1920 竖版，含中文晓晓女声、字幕、轻音乐和结尾。
- screenshots/：实际浏览器操作截图。
- video/demo-vertical-1080.mp4：无配音的连续操作录屏；原始 WebM 仅本地保留。
- final/ 中的 MP3、音乐 WAV、SRT 和结尾 PNG 可用于二次剪辑。

视频展示真实照片上传与内置示例结果，并非本次在线生成。原始作文照片保留在被忽略的 test/，不加入 Git。
封面为 AI 生成的虚构人物和概念界面，已标注示意画面。

## 复用脚本
需要 Python、Pillow、NumPy、edge-tts、FFmpeg；录屏另需 Node.js、Playwright 和 Edge。
录屏：启动 Vite（--mode promotion，不注入开发密钥），用 DEMO_URL 指定地址，然后运行 node promotion/capture.cjs。输入照片需在本地 test/ 中提供。
视频生成：依次运行 python promotion/produce.py、python promotion/finish.py、python promotion/replace-covers-v3.py。最后一步使用保留的 v3 封面。
临时依赖可通过 python -m pip install edge-tts --target promotion/.deps 安装。

## 封面生成说明
使用内置 imagegen。提示方向：YouTube Shorts 竖版、高对比大字、作文与手机批注、箭头；教师版蓝黄，家长版紫黄。定向编辑为自然肤质、真实比例和克制表情的华人女老师／妈妈，保留文字布局和示意画面标记。
