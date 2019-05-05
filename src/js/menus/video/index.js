/*
    menu - video
*/
import $ from '../../util/dom-core.js'
import { getRandom } from '../../util/util.js'
import Panel from '../panel.js'

// 构造函数
function Video(editor) {
    this.editor = editor
    this.$elem = $('<div class="w-e-menu"><i class="w-e-icon-play"></i></div>')
    this.type = 'panel'

    // 当前是否 active 状态
    this._active = false
}

// 原型
Video.prototype = {
    constructor: Video,

    onClick: function onClick() {
        this._createInsertPanel()
    },

    _createInsertPanel: function _createInsertPanel() {
        let editor = this.editor
        let uploadVideo = editor.uploadVideo
        let config = editor.config

        // id
        let upTriggerId = getRandom('up-trigger')
        let upFileId = getRandom('up-file')

        // tabs 的配置
        let tabsConfig = [{
            title: '上传视频',
            tpl: '<div class="w-e-up-img-container">\n                    ' +
            '<div id="' + upTriggerId + '" class="w-e-up-btn">\n                        ' +
            '<i class="w-e-icon-upload2"></i>\n                    </div>\n                    ' +
            '<div style="display:none">\n                        <input id="' + upFileId + '" type="file" multiple="multiple" accept="audio/mp4, video/mp4,audio/webm,video/webm"/>\n                    ' +
            '</div>\n                            </div>',
            events: [{
                // 触发选择视频
                selector: '#' + upTriggerId,
                type: 'click',
                fn: function fn() {
                    let $file = $('#' + upFileId)
                    let fileElem = $file[0]
                    if (fileElem) {
                        fileElem.click()
                    } else {
                        // 返回 true 可关闭 panel
                        return true
                    }
                }
            }, {
                // 选择视频完毕
                selector: '#' + upFileId,
                type: 'change',
                fn: function fn() {
                    let $file = $('#' + upFileId)
                    let fileElem = $file[0]
                    if (!fileElem) {
                        // 返回 true 可关闭 panel
                        return true
                    }

                    // 获取选中的 file 对象列表
                    let fileList = fileElem.files
                    if (fileList.length) {
                        uploadVideo.uploadVideo(fileList)
                    }

                    // 返回 true 可关闭 panel
                    return true
                }
            }]
        }
        ] // tabs end

        // 判断 tabs 的显示
        let tabsConfigResult = []
        tabsConfigResult.push(tabsConfig[0])

        // 创建 panel 并显示
        let panel = new Panel(this, {
            width: 300,
            tabs: tabsConfigResult
        })
        panel.show()

        // 记录属性
        this.panel = panel
    },

    // 试图改变 active 状态
    tryChangeActive: function tryChangeActive(e) {
        let editor = this.editor
        let $elem = this.$elem
        if (editor._selectedImg) {
            this._active = true
            $elem.addClass('w-e-active')
        } else {
            this._active = false
            $elem.removeClass('w-e-active')
        }
    }
}


export default Video
