/**
 * In-app「使用介绍」content.
 *
 * Kept as structured data rather than JSX so the same facts can be rendered by
 * the intro sheet and checked against README.md by
 * `scripts/test-doc-consistency.mjs` — otherwise the app's intro and the
 * repository's guide would drift apart over time.
 */

export const HELP_INTRO =
  '拍照上传学生作文 → 自动识别手写文字 → 给出可以直接抄到作文本上的批注，和一段总评。';

export interface HelpStep {
  title: string;
  lines: string[];
}

export const HELP_STEPS: HelpStep[] = [
  {
    title: '打开网页',
    lines: [
      '打开 https://gzw.rlearner.com，微信里也能直接批改',
      '第一次打开会自动出现「使用介绍」，看完点「知道了」',
      '之后可点右上角问号随时再看',
      '更推荐「安装到桌面」（可选）：Chrome 里点「立即安装」或菜单「安装应用」；在微信时可 ··· → 在浏览器打开后再装',
    ],
  },
  {
    title: '填一次 API Key',
    lines: [
      'DeepSeek 是一家国产 AI 公司；真正识别和批改作文的，是它的模型',
      'API Key 相当于调用它的钥匙，本页不会批改，只是替你把作文发给它',
      '注册后通常有免费额度；本工具也做了调用优化，批一篇大约几分钱，费用不会太高',
      '点右上角的齿轮图标，把 Key 粘贴进去',
      '点最下方的「保存」——会先验证，出现「连接成功，已保存」就对了',
      '只需填一次，以后不用再填',
    ],
  },
  {
    title: '上传作文',
    lines: [
      '「拍照上传」——拍一页收录一页',
      '「从相册选择」——可以一次选中多张',
      '主图左右滑动可翻页；下面左右按钮可把当前页左移/右移换顺序',
      '点缩略图右上角叉号可删页（会二次确认）；顺序会影响批改，提交前看一眼',
    ],
  },
  {
    title: '提交批改',
    lines: [
      '点「提交批改（N 页）」',
      '第一次大约要等 30～90 秒，但不用干等',
      '建议：交上一篇后立刻再拍下一篇；你抄这一篇时，下一篇在后台批改，不耽误时间',
      '批好会在顶部提示，点开就能看',
    ],
  },
  {
    title: '照着抄批注',
    lines: [
      '点提示，或点右上角的记录图标打开',
      '原文一个字都没改，错处后面用〔→ 改正〕标出写法',
      '一段一段照着抄就行；抄的时候手机不会熄屏',
      '抄的同时后台还能继续批下一篇，两不耽误',
    ],
  },
  {
    title: '导出（可选）',
    lines: [
      '结果页点「导出」，或批改记录 → 点「选择」→ 勾选作文 → 点「导出批注文档」',
      '点「保存文件」存到手机，随时可打开查看',
    ],
  },
];

export const HELP_KEY = {
  title: '关于 DeepSeek API Key',
  url: 'https://platform.deepseek.com/api_keys',
  urlHint: '需要先注册账号。新用户通常会有免费额度；额度用完后再充值一点即可，几块钱能用很久。',
  whatTitle: '它是什么',
  what: 'DeepSeek 是一家国产 AI 公司。API Key 是调用凭证，相当于一把钥匙。这个小程序本身不会批改，是把作文交给 DeepSeek 的模型来批——必须用这把钥匙才能调用。',
  costTitle: '要花钱吗',
  cost: '按用量计费，从你的账户余额里扣。注册后通常有免费额度；本工具做了调用优化（压缩图片等），批一篇大约几分钱，费用不会太高。工作日的 18:00 之后、以及周末全天，价格是高峰时段的一半，更划算。',
  careTitle: '一定要保管好',
  careLead: '这个 Key 相当于你的账号密码：',
  care: [
    '不要发给别人，不要发到班级群、工作群',
    '不要截图分享',
    '不要写在网上任何地方',
    '本应用只把它存在你自己手机里，不会上传到任何服务器',
  ],
  leakedTitle: '万一泄露了',
  leaked: '立刻去上面的平台把这个 Key 删掉，然后重新创建一个。旧的马上就失效了。',
};

export const HELP_FAQ: { q: string; a: string }[] = [
  { q: '提示「未配置 API Key」', a: '回到第 2 步，把 Key 填上并保存' },
  { q: '提示「API Key 无效」', a: '检查是否复制完整（一般以 sk- 开头），有没有多复制空格' },
  { q: '提示「账户余额不足」', a: '去 DeepSeek 平台充值' },
  { q: '提示「网络连接中断」', a: '检查网络即可，系统会自动重试 2 次，一般会自己好' },
  { q: '识别出来的字有错', a: '手写体偶尔会认错。点「对照原图」放大看原照片，可左右滑动翻页' },
  { q: '批改结果不见了', a: '记录只存在这台设备上。换设备、清理浏览器数据都会丢失' },
];

export const HELP_COLORS: { color: string; meaning: string }[] = [
  { color: '玫红角标（右上角数字）', meaning: '有 N 篇刚批好、你还没看过的' },
  { color: '直线 — 红 / 橙 / 紫', meaning: '要改的地方：错别字 / 病句 / 标点' },
  { color: '波浪线 — 金色', meaning: '写得好的句子' },
  { color: '绿色', meaning: '操作成功（复制成功、已保存、批改完成）' },
  { color: '分数颜色', meaning: '绿 = 90 分以上，琥珀 = 80～89，红 = 80 分以下' },
];
