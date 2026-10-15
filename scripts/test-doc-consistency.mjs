// The in-app intro (src/data/helpContent.ts) and README.md describe the same
// product to the same person. Two copies of the same facts will drift, and the
// drift is silent — she reads one, the other is wrong. This asserts the shared
// facts still appear in both.
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HELP_TS = path.join(ROOT, 'src', 'data', 'helpContent.ts');
const GUIDE_MD = path.join(ROOT, 'README.md');

/**
 * Facts that must be identical in both places. If a label changes in the UI,
 * both documents have to be updated — this is what catches "only updated one".
 */
const SHARED_FACTS = [
  'platform.deepseek.com/api_keys',
  '连接成功，已保存',
  '拍照上传',
  '从相册选择',
  '提交批改',
  '导出批注文档',
  '保存文件',
  '安装应用',
  '微信',
  '使用介绍',
  '国产 AI',
  '不要发给别人',
  '几分钱',
  '免费额度',
  '调用优化',
  '左右按钮',
  '30～90 秒',
];

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log('PASS  ' + name);
    pass++;
  } catch (e) {
    console.log('FAIL  ' + name + '\n      ' + e.message);
    fail++;
  }
};

check('both documents exist', () => {
  assert.ok(fs.existsSync(HELP_TS), 'src/data/helpContent.ts missing');
  assert.ok(fs.existsSync(GUIDE_MD), 'README.md missing');
});

const helpText = fs.existsSync(HELP_TS) ? fs.readFileSync(HELP_TS, 'utf8') : '';
const guideText = fs.existsSync(GUIDE_MD) ? fs.readFileSync(GUIDE_MD, 'utf8') : '';

check('each shared fact appears in BOTH the app help and the README', () => {
  const missing = [];
  for (const fact of SHARED_FACTS) {
    const inApp = helpText.includes(fact);
    const inGuide = guideText.includes(fact);
    if (!inApp || !inGuide) {
      missing.push(`${fact}  (app:${inApp ? 'yes' : 'NO'} readme:${inGuide ? 'yes' : 'NO'})`);
    }
  }
  assert.equal(missing.length, 0, 'drifted:\n      ' + missing.join('\n      '));
});

check('the app help covers all six steps', () => {
  for (const t of ['打开网页', '填一次 API Key', '上传作文', '提交批改', '照着抄批注', '导出']) {
    assert.ok(helpText.includes(t), `app help is missing step "${t}"`);
  }
});

check('the README still warns about protecting the key', () => {
  assert.ok(/保管好/.test(guideText), 'README lost the "keep it safe" section');
  assert.ok(/泄露/.test(guideText), 'README lost the "if leaked" section');
  assert.ok(/保管好|一定要保管好/.test(helpText), 'app help lost the warning');
  assert.ok(/泄露/.test(helpText), 'app help lost the "if leaked" advice');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
