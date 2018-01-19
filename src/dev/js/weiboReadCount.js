const $ = require('jquery');

$(document).ready(() => {
    if (location.href.indexOf('weibo.com') === -1) {
        return;
    }

    let checkCount = 0;

    function checkLogin() {
        checkCount++;
        const gn_set = $('.gn_set').length > 0;
        if (gn_set) {
            chrome.runtime.sendMessage({
                operation: 'weiboReadCount'
            });
        } else {
            if (checkCount < 10) {
                setTimeout(checkLogin, 200);
            } else {
                console.log('超时');
            }
        }
    }
    checkLogin();
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.operation === 'readCountDone') {
            console.log('readCountDone');
            $.Toast('房天下新媒体工具', '采集成功', 'fang', {
                has_icon: false,
                timeout: 1500
            });
        } else if (request.operation === 'readCountTime') {
            $.Toast('房天下新媒体工具', request.msg, 'fang', {
                has_icon: false,
                timeout: 1500
            });
        }
    });
});