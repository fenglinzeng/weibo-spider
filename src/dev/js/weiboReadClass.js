const $ = require('jquery');
const config = require('./config');

const domainFangPub = config.urls.API_FANG_PUB;

class WeiboCount {
    constructor(localVersion) {
        this.localVersion = localVersion;
        this.currentPage = 0;
        this.weiboData = [];
        this.overTime = 0;
        this.getReadCount();
    }

    getUID() {
        return $.ajax({
            url: 'https://weibo.com/',
            type: 'get'
        });
    }

    getFansHTML(str) {
        const arr = str.match(/FM.view\({"ns":"pl.rightmod.myinfo.index"[\S\s]+?}\)/);
        let html = '';
        let fans = '获取不到',
            follow = '获取不到',
            weibo = '获取不到';
        if (arr) {
            const htmlArr = arr[0].match(/"html":"([\s\S]+)"}\)/);
            if (htmlArr) {
                html = htmlArr[1].replace(/\\t/g, '').replace(/\\r/g, '').replace(/\\n/g, '').replace(/\\/g, '');
                const $html = $(html);
                fans = $html.find('[node-type="fans"]').text();
                follow = $html.find('[node-type="follow"]').text();
                weibo = $html.find('[node-type="weibo"]').text();
            }
            return $.Deferred().resolve({
                fans,
                follow,
                weibo
            });
        } else {
            this.page_id = new RegExp(/\$CONFIG\[\'page_id\'\]=\'+([^\s'";]*)/g).exec(str)[1];
            return $.ajax({
                url: 'https://weibo.com/p/' + this.page_id + '/home'
            }).then(res => {
                const arr = res.match(/FM.view\({"ns":"","domid":"Pl_Core_T8CustomTriColumn__3"[\S\s]+?}\)/);
                if (arr) {
                    const htmlArr = arr[0].match(/"html":"([\s\S]+)"}\)/);
                    if (htmlArr) {
                        html = htmlArr[1].replace(/\\t/g, '').replace(/\\r/g, '').replace(/\\n/g, '').replace(/\\/g, '');
                        const $html = $(html);
                        const s_txt2Arr = $html.find('strong');
                        fans = s_txt2Arr.eq(1).text();
                        follow = s_txt2Arr.eq(0).text();
                        weibo = s_txt2Arr.eq(2).text();
                    }
                    return $.Deferred().resolve({
                        fans,
                        follow,
                        weibo
                    });
                }
            });
        }
    }

    getReadCount() {
        this.getUID().then(data => {
            this.uid = new RegExp(/\$CONFIG\[\'uid\'\]=\'+(\d*)/g).exec(data);
            this.nick = new RegExp(/\$CONFIG\[\'nick\'\]=\'+([^\s'";]*)/g).exec(data);

            if (this.uid && this.nick) {
                this.uid = this.uid[1];
                this.nick = this.nick[1];
            } else {
                return;
            }

            this.getFansHTML(data).then(obj => {
                this.fans = obj.fans;
                this.follow = obj.follow;
                this.weibo = obj.weibo;
                this.checkStatus().then(res => {
                    if (res.code) {
                        this.overTime = res.overTime;
                        this.getWeiboData();
                    } else {
                        console.log(res);
                    }
                });
            }).catch(err => {
                console.log(err);
                debugger;
            });
        });
    }

    checkStatus() {
        const uid = this.uid;
        return $.ajax({
            url: domainFangPub + '/wb/checkstatus',
            type: 'post',
            data: {
                uid: uid
            }
        });
    }

    getParam(uid) {
        const param = {
            ajwvr: 6,
            domain: 100505,
            topnav: 1,
            wvr: 6,
            is_all: 1,
            pagebar: 0,
            pl_name: 'Pl_Official_MyProfileFeed__20',
            id: '100505' + uid,
            script_uri: '/' + uid + '/profile',
            feed_type: 0,
            page: 1,
            pre_page: 0,
            domain_op: 100505,
            __rnd: new Date().getTime()
        };

        this.currentPage++;

        if (this.currentPage % 3 === 1) {
            // param.page = 1;
            param.pagebar = 0;
            param.pre_page = 0;
        } else if (this.currentPage % 3 === 2) {
            // param.page = 1;
            param.pagebar = 0;
            param.pre_page = Math.ceil(this.currentPage / 3);
        } else if (this.currentPage % 3 === 0) {
            // param.page = 1;
            param.pagebar = 1;
            param.pre_page = Math.ceil(this.currentPage / 3);
        }

        param.page = Math.ceil(this.currentPage / 3);

        return param;
    }

    getWeiboData() {
        const uid = this.uid;
        $.ajax({
            url: 'https://weibo.com/p/aj/v6/mblog/mbloglist',
            type: 'get',
            data: this.getParam(uid)
        })
            .done(data => {
                this.handleHTML(data);
            });
    }

    handleHTML(data) {
        const parent = '<div>' + data.data + '</div>';
        const $parent = $(parent);
        const arr = [];
        const year = new Date().getFullYear();
        $parent.find('.WB_cardwrap.WB_feed_type').each((index, item) => {
            const $item = $(item);

            let link = $item.find('[node-type="feed_list_item_date"]').attr('href');
            if (link) {
                link = link.split('?')[0];
            }

            let time = $item.find('[node-type="feed_list_item_date"]').text();
            if (time) {
                if (/月/.test(time)) {
                    time = year + '-' + time.replace(/月/, '-').replace(/日|^\s*/g, '');
                }
                if (/今天/.test(time)) {
                    const now = new Date();
                    const year = now.getFullYear().toString();
                    const month = (now.getMonth() + 1).toString();
                    const date = now.getDate().toString();
                    time = time.replace(/今天/, year + '-' + month + '-' + date);
                }
                if (/昨天/.test(time)) {
                    const now = new Date();
                    const timestamp = now.getTime();
                    now.setTime(timestamp - (1000 * 1 * 24 * 60 * 60));
                    const year = now.getFullYear().toString();
                    const month = (now.getMonth() + 1).toString();
                    const date = now.getDate().toString();
                    time = time.replace(/今天/, year + '-' + month + '-' + date);
                }
            }


            let count = $item.find('i.S_txt2');
            if (count.length > 1) {
                count = $.trim(count.eq(1).text().replace(/阅读/, '').replace(/推广/, ''));
            } else {
                count = $.trim(count.text().replace(/阅读/, '').replace(/推广/, ''));
            }

            const getChinese = function(strValue) {
                if (strValue !== null && strValue !== '') {
                    const pattern = new RegExp('[`~!@#$^&*()=|{}\':;\',\\[\\].<>/?~@#￥……&*&mdash;—|]');
                    let rs = '';
                    for (let i = 0; i < strValue.length; i++) {
                        rs = rs + strValue.substr(i, 1).replace(pattern, '');
                    }
                    if (rs) {
                        return rs;
                    }
                    return '无汉字';
                } else {
                    return '无汉字';
                }
            };
            arr.push({
                html: getChinese($.trim($item.find('[node-type="feed_list_content"]').text())),
                count: count,
                time: time,
                link: link
            });
        });

        this.weiboData.push(...arr);

        const overMonth = this.isOverTime(arr[arr.length - 1]);
        if (!overMonth) {
            return this.getWeiboData();
        }

        const param = {
            nickname: this.nick,
            uid: this.uid,
            info: JSON.stringify({
                fans: this.fans,
                follow: this.follow,
                weibo: this.weibo
            }),
            plugin_version: this.localVersion,
            data: JSON.stringify(this.weiboData)
        };
        console.log(param);

        this.sendData(param);
    }

    isOverTime(data) {
        const lastTime = data.time;
        const overMonth = (new Date().getTime() - new Date(lastTime).getTime()) > this.overTime;
        return overMonth;
    }

    sendData(data) {
        $.ajax({
            url: domainFangPub + '/wb/readcount',
            type: 'post',
            data: data
        })
            .done(res => {
                console.log(res);
            })
            .fail(err => {
                console.log(err);
            });
    }
}

module.exports = WeiboCount;