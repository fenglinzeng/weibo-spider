const WeiboCount = require('./weiboReadClass');
const localVersion = '0.0.1';

// 全局消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 如果是采集
    if (request.operation === 'weiboReadCount') {
        new WeiboCount(localVersion);
    }
});