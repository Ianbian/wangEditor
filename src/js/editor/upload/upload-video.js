import {arrForEach, objForEach} from '../../util/util'
import Progress from './progress.js'

// 构造函数
function UploadVideo(editor) {
    this.editor = editor
}

// 原型
UploadVideo.prototype = {
    constructor: UploadVideo,

    // 根据 debug 弹出不同的信息
    _alert: function _alert(alertInfo, debugInfo) {
        let editor = this.editor
        let debug = editor.config.debug
        // let debug = true
        let customAlert = editor.config.customAlert

        if (debug) {
            throw new Error('wangEditor: ' + (debugInfo || alertInfo))
        } else {
            if (customAlert && typeof customAlert === 'function') {
                customAlert(alertInfo)
            } else {
                alert(alertInfo)
            }
        }
    },

    // 根据链接插入图片
    insertLinkVideo: function (link) {
        if (!link) {
            return
        }
        const editor = this.editor
        const config = editor.config

        // 校验格式
        const linkImgCheck = config.linkImgCheck
        let checkResult
        if (linkImgCheck && typeof linkImgCheck === 'function') {
            checkResult = linkImgCheck(link)
            if (typeof checkResult === 'string') {
                // 校验失败，提示信息
                alert(checkResult)
                return
            }
        }
        editor.cmd.do('insertHTML', `<p><video src="${link}" style="max-width:100%;" controls autobuffer/></p>`)
        editor.cmd.do('insertHTML','<p><br></p>')
    },

    // 上传视频
    uploadVideo: function uploadVideo(files) {
        let _this3 = this

        if (!files || !files.length) {
            return
        }

        // ------------------------------ 获取配置信息 ------------------------------
        let editor = this.editor
        let config = editor.config
        let uploadImgServer = config.uploadImgServer
        // let uploadImgShowBase64 = config.uploadImgShowBase64

        let maxSize = 100 * 1024 * 1024       //100M
        let maxSizeM = maxSize / 1000 / 1000
        let maxLength = 1
        let uploadFileName = 'files'
        let uploadImgParams = config.uploadImgParams || {}
        let uploadImgParamsWithUrl = config.uploadImgParamsWithUrl
        let uploadImgHeaders = {}
        let hooks = config.uploadImgHooks || {}
        let timeout = 5 * 60 * 1000        //5 min
        let withCredentials = config.withCredentials
        if (withCredentials == null) {
            withCredentials = false
        }

        const customUploadVideo = config.customUploadVideo

        if (!customUploadVideo) {
            // 没有 customUploadVideo 的情况下，需要如下两个配置才能继续进行视频上传
            if (!uploadImgServer) {
                return
            }
        }

        // ------------------------------ 验证文件信息 ------------------------------
        let resultFiles = []
        let errInfo = []
        arrForEach(files, function (file) {
            let name = file.name
            let size = file.size

            // chrome 低版本 name === undefined
            if (!name || !size) {
                return
            }

            if (/\.(mp4|avi|mkv|mpeg|flv|3gp|wmv|MP4|AVI|MKV|MPEG|FLV|3GP|WMV|MOV|mov|webm)$/i.test(name) === false) {
                // 后缀名不合法，不是视频
                errInfo.push('\u3010' + name + '\u3011\u4E0D\u662F\u56FE\u7247')
                return
            }
            if (maxSize < size) {
                // 上传图片过大
                errInfo.push('\u3010' + name + '\u3011\u5927\u4E8E ' + maxSizeM + 'M')
                return
            }

            // 验证通过的加入结果列表
            resultFiles.push(file)
        })
        // 抛出验证信息
        if (errInfo.length) {
            this._alert('视频验证未通过: \n' + errInfo.join('\n'))
            return
        }
        if (resultFiles.length > maxLength) {
            this._alert('一次最多上传' + maxLength + '个视频')
            return
        }

        // ------------------------------ 自定义上传 ------------------------------
        if (customUploadVideo && typeof customUploadVideo === 'function') {
            customUploadVideo(resultFiles, this.insertLinkVideo.bind(this))

            // 阻止以下代码执行
            return
        }

        // 添加视频数据
        let formdata = new FormData()
        arrForEach(resultFiles, function (file) {
            let name = uploadFileName || file.name
            formdata.append(name, file)
        })


        // ------------------------------ 上传视频 ------------------------------
        if (uploadImgServer && typeof uploadImgServer === 'string') {
            // 添加参数
            let uploadImgServerArr = uploadImgServer.split('#')
            uploadImgServer = uploadImgServerArr[0]
            let uploadImgServerHash = uploadImgServerArr[1] || ''
            objForEach(uploadImgParams, function (key, val) {
                val = encodeURIComponent(val)

                // 第一，将参数拼接到 url 中
                if (uploadImgParamsWithUrl) {
                    if (uploadImgServer.indexOf('?') > 0) {
                        uploadImgServer += '&'
                    } else {
                        uploadImgServer += '?'
                    }
                    uploadImgServer = uploadImgServer + key + '=' + val
                }

                // 第二，将参数添加到 formdata 中
                formdata.append(key, val)
            })
            if (uploadImgServerHash) {
                uploadImgServer += '#' + uploadImgServerHash
            }

            // 定义 xhr
            let xhr = new XMLHttpRequest()
            xhr.open('POST', uploadImgServer)

            // 设置超时
            xhr.timeout = timeout
            xhr.ontimeout = function () {
                // hook - timeout
                if (hooks.timeout && typeof hooks.timeout === 'function') {
                    hooks.timeout(xhr, editor)
                }

                _this3._alert('上传图片超时')
            }

            // 监控 progress
            if (xhr.upload) {
                xhr.upload.onprogress = function (e) {
                    let percent = void 0
                    // 进度条
                    let progressBar = new Progress(editor)
                    if (e.lengthComputable) {
                        percent = e.loaded / e.total
                        progressBar.show(percent)
                    }
                }
            }

            // 返回数据
            xhr.onreadystatechange = function () {
                let result = void 0
                if (xhr.readyState === 4) {
                    if (xhr.status < 200 || xhr.status >= 300) {
                        // hook - error
                        if (hooks.error && typeof hooks.error === 'function') {
                            hooks.error(xhr, editor)
                        }

                        // xhr 返回状态错误
                        _this3._alert('上传视频发生错误', '\u4E0A\u4F20\u56FE\u7247\u53D1\u751F\u9519\u8BEF\uFF0C\u670D\u52A1\u5668\u8FD4\u56DE\u72B6\u6001\u662F ' + xhr.status)
                        return
                    }

                    result = xhr.responseText
                    if ((typeof result === 'undefined' ? 'undefined' : typeof (result)) !== 'object') {
                        try {
                            result = JSON.parse(result)
                        } catch (ex) {
                            // hook - fail
                            if (hooks.fail && typeof hooks.fail === 'function') {
                                hooks.fail(xhr, editor, result)
                            }

                            _this3._alert('上传视频失败', '上传视频返回结果错误，返回结果是: ' + result)
                            return
                        }
                    }
                    if (!hooks.customInsert && result.errno != '0') {
                        // hook - fail
                        if (hooks.fail && typeof hooks.fail === 'function') {
                            hooks.fail(xhr, editor, result)
                        }

                        // 数据错误
                        _this3._alert('上传视频失败', '上传视频返回结果错误，返回结果 errno=' + result.errno)
                    } else {
                        if (hooks.customInsert && typeof hooks.customInsert === 'function') {
                            // 使用者自定义插入方法
                            // let _video_src = ' <video class="video-js" controls preload="auto" data-setup="{}"><source src="' + result.obj + '" type="video/mp4"></video>'
                            editor.cmd.do('insertHTML', '<video src="' + result.obj + '" style="max-width: 50%;max-height:50%" controls autobuffer />')
                            _this3._alert('upload successfully')
                            // hooks.customInsert(_this3.insertLinkImg.bind(_this3), result, editor)
                        } else {
                            // 将图片插入编辑器
                            let data = result.data || []
                            data.forEach(function (link) {
                                _this3.insertLinkImg(link)
                            })
                        }

                        // hook - success
                        if (hooks.success && typeof hooks.success === 'function') {
                            hooks.success(xhr, editor, result)
                        }
                    }
                }
            }

            // hook - before
            if (hooks.before && typeof hooks.before === 'function') {
                let beforeResult = hooks.before(xhr, editor, resultFiles)
                if (beforeResult && (typeof beforeResult === 'undefined' ? 'undefined' : typeof(beforeResult)) === 'object') {
                    if (beforeResult.prevent) {
                        // 如果返回的结果是 {prevent: true, msg: 'xxxx'} 则表示用户放弃上传
                        this._alert(beforeResult.msg)
                        return
                    }
                }
            }

            // 自定义 headers
            objForEach(uploadImgHeaders, function (key, val) {
                xhr.setRequestHeader(key, val)
            })

            // 跨域传 cookie
            xhr.withCredentials = withCredentials

            // 发送请求
            xhr.send(formdata)

            // 注意，要 return 。不去操作接下来的 base64 显示方式
            return
        }
    }
}

export default UploadVideo
