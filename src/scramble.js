// TextScramble 的 vanilla 移植(原组件:motion/react 的 TextScramble)——
// 字符从左到右逐个"落定",未落定的位置用随机字符滚动填充,形成解码式导入。
const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function scrambleText(el, { duration = 0.8, speed = 0.04, characterSet = DEFAULT_CHARS } = {}) {
  if (!el) return Promise.resolve();
  // 记住原文:重复入场/重复触发时不会被上一次的乱序结果污染
  if (el.dataset.scrambleSrc === undefined) el.dataset.scrambleSrc = el.textContent;
  const text = el.dataset.scrambleSrc;
  const steps = duration / speed;
  let step = 0;
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      let out = '';
      const progress = step / steps;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') { out += ' '; continue; }
        out += progress * text.length > i
          ? text[i]
          : characterSet[(Math.random() * characterSet.length) | 0];
      }
      el.textContent = out;
      if (++step > steps) {
        clearInterval(timer);
        el.textContent = text;   // 落定后恢复原文(等价原组件 setScrambledText(null))
        resolve();
      }
    }, speed * 1000);
  });
}
