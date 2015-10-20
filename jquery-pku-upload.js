+(function($) {
    'use strict';

    var WisdomUpload = function(element, options) {
        this.fileUrls = [];
        this.init(element, options);
        this.eventInit();
    };

    WisdomUpload.prototype = {
        init: function(element, options) {
            var self = this;
            this.$element = $(element);

            this.options = {};
            $.extend(true, this.options, $.fn.pkuUpload.defaults, options);

            this.$browserBtn = this.$element.find('a[data-purpose="browse"]');
            this.$uploadBtn = this.$element.find('a[data-purpose="upload"]');
            this.$helpBlock = this.$element.find('.upload-help');
            this.$localAttachPath = this.$element.find('input[name=' + this.options.localAttachPath + ']');
            this.$fileName = this.$element.find('input[name=fileName]');
            if (this.options.data) {
                $.each(this.options.data, function(i, d) {
                    //将附件路径放入数组中
                    self.fileUrls.push(d);
                    self._buildFileItem(d);
                });
            }
        },
        eventInit: function() {
            var self = this;

            this.$browserBtn.off();
            $('input[name=upload]', self.$element).off();
            this.$uploadBtn.off();

            this.$browserBtn.click(function() { //点击浏览事件
                // self.$fileField.click(); //很奇怪，只能使用原生的方式绑定，否则无法二次上传
                $('input[name="upload"]', self.$element).click();
            });

            // this.$fileField.on('change', $.proxy(self.onFileChange, self));
            $('input[name=upload]', self.$element).on('change', $.proxy(self.onFileChange, self));

            this.$uploadBtn.click(function() {
                //判断是否有附件
                if (!self.$localAttachPath.val()) {
                    alertify.alert('请点击浏览选择需要上传的文件');
                    return false;
                }
                self.doUpload();
            });

            //初始化删除事件
            this.$element.delegate('span.mfr', 'click', function() {
                self.removeFile(this);
                var $container = self.$element.find('div[data-purpose="multiContainer"]');
                if ($container.children().length === 0) {
                    $container.css('display', 'none');
                    self.$helpBlock.html('').removeClass('show').addClass('hide');
                }
            });
        },
        setOptions: function(options) {
            $.extend(true, this.options, $.fn.pkuUpload.defaults, options);

            //render the paginator
            this.eventInit();
        },
        removeFile: function(item) {
            var $item = $(item).closest('.uf-item');
            var fileUrl = $item.data('url');
            var index = _.findIndex(this.fileUrls, {
                'url': fileUrl
            });
            if (index > -1) {
                $.ajax({
                        url: this.options.removeUrl,
                        type: 'get',
                        dataType: 'json',
                        data: {
                            jQuerydownloadName: fileUrl
                        }
                    })
                    .always(function(data) {});

                this.fileUrls.splice(index, 1);
            }
            $item.remove();
        },
        getFileUrls: function() {
            return this.fileUrls;
        },
        getFileNames: function() {
            return this.fileNames;
        },
        checkSubffix: function(fileName, extentions) {
            var extention,
                lastDot = fileName.lastIndexOf('.');
            if (lastDot && (extention = fileName.substring(lastDot + 1))) {

                return $.inArray(extention, extentions);
            } else {
                return false;
            }
        },
        onFileChange: function() {
            var self = this;
            var filePath,
                fileName;
            filePath = $('input[name=upload]', self.$element).val().split('\\');
            fileName = filePath[filePath.length - 1];
            fileName = fileName.toLowerCase();
            if (this.checkSubffix(fileName, this.options.subfix) === -1) {
                this.$helpBlock.html('仅支持' + this.options.subfix + ' 类型文件').removeClass('hide').addClass('show');
            } else {
                this.$localAttachPath.val(fileName);
                this.options.fileName = fileName;
                if (this.$uploadBtn.length === 0) { //没有上传按钮时自动上传
                    this.$helpBlock.html('上传中...').removeClass('hide').addClass('show');
                    self.doUpload();
                }
            }
        },
        _buildFileItem: function(itemData) {
            var $contarner = this.$element.find('div[data-purpose="multiContainer"]');
            if ($contarner) {
                $contarner.append('<div data-url="' + itemData.url + '" class="uf-item"><a href="/download?fileName=' + itemData.url + '" class="fn">' + itemData.name + '</a><span class="mfr glyphicon glyphicon-remove" aria-hidden="true"></span></div>');
                if ($contarner.children().length > 0) {
                    $contarner.css('display', 'block');
                } else {
                    $contarner.css('display', 'none');
                }
            }
        },
        doUpload: function() {
            var self = this,
                o = this.options;
            $.ajaxFileUpload({
                url: o.url + '?dir=' + o.dir,
                type: 'post',
                secureuri: false, //一般设置为false
                upload: o.fileElementId, // 上传文件的id、name属性名
                dataType: 'json', //返回值类型，一般设置为json、application/json
                fileElementId: o.fileElementId,
                success: function(data) {
                    if (data[0].error) {
                        self.$localAttachPath.val('');
                        self.$helpBlock.html(data[0].message).removeClass('hide').addClass('show');
                    } else {
                        var fileUrl = data[0].attachment;
                        var fileName = self.$fileName ? self.$fileName.val() : '';

                        var itemData = {
                            'name': fileName ? fileName : o.fileName,
                            'url': fileUrl
                        }

                        self.$helpBlock.html('上传文件 —— ' + o.fileName + ' 成功！').removeClass('hide').addClass('show');
                        if (o.multi) { //多文件
                            self._buildFileItem(itemData);
                            //清空文件名
                            self.$fileName && self.$fileName.val('');
                        } else {
                            $('input[name="' + o.attachmentName + '"]', self.$element).val(fileUrl);
                        }

                        //将附件路径放入数组中
                        self.fileUrls.push(itemData);

                        if (o.onAfterUpload && typeof o.onAfterUpload === 'function') {
                            o.onAfterUpload.call(self, data);
                        }
                    }
                    //重新绑定一次事件，上传一次以后事件就消失了，需要重新绑定。。。。
                    // self.$fileField.on('change', $.proxy(self.onFileChange, self));
                    $('input[name=upload]', self.$element).on('change', $.proxy(self.onFileChange, self));
                },
                fail: function() {
                    self.$helpBlock.html('上传文件 —— ' + o.fileName + ' 失败！').removeClass('hide').addClass('show');
                }
            });
        }
    };

    $.fn.pkuUpload = function(option) {
        var args = arguments,
            result = null;
        $(this).each(function(index, item) {
            var $this = $(item),
                data = $this.data('wisdomUpload'),
                options = (typeof option !== 'object') ? null : option;

            if (!data) {
                data = new WisdomUpload(this, options);

                $this = $(data.$element);

                $this.data('wisdomUpload', data);

                return;
            }

            if (typeof option === 'string') {

                if (data[option]) {
                    result = data[option].apply(data, Array.prototype.slice.call(args, 1));
                } else {
                    throw 'Method ' + option + ' does not exist';
                }

            } else {
                result = data.setOptions(option);
            }
        });

        return result;
    };

    $.fn.pkuUpload.defaults = {
        multi: false,
        subfix: ['jpg', 'jpeg', 'png'],
        helpTarget: 'uploadHelp', //需要id
        attachmentName: 'attachment',
        url: '../common/kindeditor!jQueryFileUpload.action',
        removeUrl: '/kindeditor!jQueryRemove.action',
        dir: 'temp',
        fileElementId: 'upload',
        localAttachPath: 'attachementPath',
        onAfterUpload: ''
    };

})(window.jQuery);
