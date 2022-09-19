
import consts from "./consts.js";

class AbortError extends Error {
    constructor(message) {
        super(message);
        this.name = "AbortError";
    }
}

class AbsrtactItem {
    constructor(owner, ID, item_name, caption, visible, type, js_filename) {
        this.types = ["root", "users", "roles", "tasks", 'task',
            "items", "items", "details", "reports",
            "item", "item", "detail_item", "report", "detail"
        ];
        if (visible === undefined) {
            visible = true;
        }
        if (owner === undefined) {
            owner = null;
        }
        this.owner = owner;
        this.item_name = item_name || '';
        this.item_caption = caption || '';
        this.visible = visible;
        this.ID = ID || null;
        this.item_type_id = type;
        this.item_type = '';
        if (type) {
            this.item_type = this.types[type - 1];
        }
        if (js_filename) {
            this.js_filename = 'js/' + js_filename;
        }
        this.items = [];
        if (owner) {
            if (!owner.find(item_name)) {
                owner.items.push(this);
            }
            if (!(item_name in owner)) {
                owner[item_name] = this;
            }
            this.task = owner.task;
        }
    }

    get_master_field(fields, master_field) {
        var i = 0,
            len = fields.length;
        for (; i < len; i++) {
            if (fields[i].ID == master_field) {
                return fields[i];
            }
        }
    }

    each_item(callback) {
        var i = 0,
            len = this.items.length,
            value;
        for (; i < len; i++) {
            value = callback.call(this.items[i], this.items[i], i);
            if (value === false) {
                break;
            }
        }
    }

    all(func) {
        var i = 0,
            len = this.items.length;
        func.call(this, this);
        for (; i < len; i++) {
            this.items[i].all(func);
        }
    }

    find(item_name) {
        var i = 0,
            len = this.items.length;
        for (; i < len; i++) {
            if (this.items[i].item_name === item_name) {
                return this.items[i];
            }
        }
    }

    item_by_ID(id_value) {
        var result;
        if (this.ID === id_value) {
            return this;
        }
        var i = 0,
            len = this.items.length;
        for (; i < len; i++) {
            result = this.items[i].item_by_ID(id_value);
            if (result) {
                return result;
            }
        }
    }

    addChild(ID, item_name, caption, visible, type, js_filename, master_field) {
        var NewClass;
        if (this.getChildClass) {
            NewClass = this.getChildClass();
            if (NewClass) {
                return new NewClass(this, ID, item_name, caption,
                    visible, type, js_filename, master_field);
            }
        }
    }

    send_request(request, params, callback) {
        return this.task.process_request(request, this, params, callback);
    }

    init(info) {
        var i = 0,
            items = info.items,
            child,
            len = items.length,
            item_info;
        for (; i < len; i++) {
            item_info = items[i][1];
            child = this.addChild(item_info.id, item_info.name,
                item_info.caption, item_info.visible, item_info.type,
                item_info.js_filename, item_info.master_field);
            child._default_order = item_info.default_order;
            child._primary_key = item_info.primary_key;
            child._deleted_flag = item_info.deleted_flag;
            child._master_id = item_info.master_id;
            child._master_rec_id = item_info.master_rec_id;
            child.keep_history = item_info.keep_history;
            child.edit_lock = item_info.edit_lock;
            child._view_params = item_info.view_params;
            child._edit_params = item_info.edit_params;
            child._virtual_table = item_info.virtual_table;
            child.prototype_ID = item_info.prototype_ID
            child.master_applies = item_info.master_applies
            if (child.initAttr) {
                child.initAttr(item_info);
            }
            child.init(item_info);
        }
    }

    bind_items() {
        var i = 0,
            len = this.items.length;
        if (this._bind_item) {
            this._bind_item();
        }
        for (; i < len; i++) {
            this.items[i].bind_items();
        }
    }

    _check_args(args) {
        var i,
            result = {};
        for (i = 0; i < args.length; i++) {
            if (args[i] instanceof jQuery) {
                result['jquery'] = args[i]
            }
            else if (args[i] instanceof AbsrtactItem) {
                result['item'] = args[i]
            }
            else {
                result[typeof args[i]] = args[i];
            }
        }
        return result;
    }

    _file_loaded(js_filename) {
        for (let i = 0; i < document.scripts.length; i++) {
            let script = document.scripts[i].src.split('?')[0],
                file_name = js_filename.split('?')[0],
                arr1 = js_filename.split('/'),
                arr2 = script.split('/'),
                found = true;
            for (let j = 0;  j < arr1.length; j++) {
                if (arr1[arr1.length - 1 - j] !== arr2[arr2.length - 1 - j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
    }

    load_script(js_filename, callback, onload) {
        var self = this,
            url,
            s0,
            s;
        if (js_filename && !this._file_loaded(js_filename)) {
            s = document.createElement('script');
            s0 = document.getElementsByTagName('script')[0];
            url = js_filename;

            s.src = url;
            s.type = "text/javascript";
            s.async = true;
            s0.parentNode.insertBefore(s, s0);
            s.onload = function() {
                if (onload) {
                    onload.call(self, self);
                }
                if (callback) {
                    callback.call(self, self);
                }
            };
        } else {
            if (callback) {
                callback.call(self, self);
            }
        }
    }

    load_module(callback) {
        this.load_modules([this], callback);
    }

    load_modules(item_list, callback) {
        var self = this,
            i = 0,
            len = item_list.length,
            item,
            list = [],
            mutex = 0,
            calcback_executing = false,
            load_script = function(item) {
                item.load_script(
                    item.js_filename,
                    function() {
                        if (--mutex === 0) {
                            if (callback && !calcback_executing) {
                                calcback_executing = true;
                                callback.call(self, self);
                            }
                        }
                    },
                    function() {
                        item.bind_handlers();
                    }
                );
            };
        for (; i < len; i++) {
            item = item_list[i];
            if (item.js_filename) list.push(item);
            if (item.details) {
                item.each_detail(function(d) {
                    if (d.js_filename) list.push(d);
                });
            }
        }
        len = list.length;
        mutex = len;
        if (len) {
            for (i = 0; i < len; i++) {
                load_script.call(list[i], list[i]);
            }
        } else {
            if (callback) {
                callback.call(this, this);
            }
        }
    }

    bind_handlers() {
        let events = task.events['events' + this.ID];
        if (this.master_field) {
            events = task.events['events' + this.prototype_ID];
        }
        this._events = [];
        for (var event in events) {
            if (events.hasOwnProperty(event)) {
                //~ if (this[event]) {
                    //~ console.error(this.item_name + ' client module ' + ': method "' +
                        //~ event + '" will override existing attribute. Please, rename the function.');
                //~ }
                this[event] = events[event];
                this._events.push([event, events[event]]);
            }
        }
    }

    bind_events() {
        var i = 0,
            len = this.items.length;

        this.bind_handlers();

        for (; i < len; i++) {
            this.items[i].bind_events();
        }
    }

    can_view() {
        return this.task.has_privilege(this, 'can_view');
    }

    _search_template(name, suffix) {
        var template,
            search = "." + name;
        if (suffix) {
            search = "." + name + "-" + suffix
        }
        template = task.templates.find(search);
        if (template.length) {
            return template;
        }
    }

    find_template(suffix, options) {
        var result,
            template,
            name,
            item = this;
        if (options.template_class) {
            template = this._search_template(options.template_class);
        }
        if (!template) {
            if (item.item_type === "detail") {
                template = this._search_template(item.owner.item_name + "-" + item.item_name, suffix);
                if (!template) {
                    template = this._search_template(item.owner.owner.item_name + "-details", suffix);
                }
                if (!template && options && options.buttons_on_top) {
                    template = this._search_template("default-top", suffix);
                }
                if (!template) {
                    template = this._search_template('default', suffix);
                }
                if (!template) {
                    item = item.owner;
                }
            }
            if (!template) {
                while (true) {
                    name = item.item_name;
                    template = this._search_template(item.item_name, suffix);
                    if (template) {
                        break;
                    }
                    item = item.owner;
                    if (item === item.task) {
                        break;
                    }
                }
            }
        }
        if (!template && options && options.buttons_on_top) {
            template = this._search_template("default-top", suffix);
        }
        if (!template) {
            template = this._search_template('default', suffix);
        }
        if (template) {
            result = template.clone();
        }
        else {
            this.warning(this.item_caption + ': ' +  suffix + ' form template not found.')
        }
        return result;
    }

    server(func_name, params) {
        var args = this._check_args(arguments),
            callback = args['function'],
            async = args['boolean'],
            res,
            err,
            result;
        if (params !== undefined && (params === callback || params === async)) {
            params = undefined;
        }
        if (params === undefined) {
            params = [];
        } else if (!$.isArray(params)) {
            params = [params];
        }
        if (callback || async) {
            this.send_request('server', [func_name, params], function(result) {
                res = result[0];
                err = result[1];
                if (callback) {
                    callback.call(this, res, err);
                }
                if (err) {
                    throw new Error(err);
                }
            });
        } else {
            result = this.send_request('server', [func_name, params]);
            res = result[0];
            err = result[1];
            if (err) {
                throw new Error(err);
            } else {
                return res;
            }
        }
    }

    _focus_form(form) {
        this.task._focus_element(form);
    }

    _create_form_header(form, options, form_type, container) {
        var $doc,
            $form,
            $title,
            mouseX,
            mouseY,
            defaultOptions = {
                title: this.item_caption,
                close_button: true,
                print: false
            },
            form_header,
            item_class = '';

        function captureMouseMove(e) {
            var $title = $form.find('.modal-header');
            if (mouseX) {
                e.preventDefault();
                $title.css('cursor', 'auto');
                $form.css('margin-left', parseInt($form.css('margin-left'), 10) + e.screenX - mouseX);
                $form.css('margin-top', parseInt($form.css('margin-top'), 10) + e.screenY - mouseY);
                mouseX = e.screenX;
                mouseY = e.screenY;
            }
        }

        function release_mouse_move(e) {
            mouseX = undefined;
            mouseY = undefined;
            $doc.off("mousemove.modalform");
            $doc.off("mouseup.modalform");
        }
        if (task.old_forms) {
            form_header = $('<div class="modal-header">');
            form_header.css('display', 'block');
        }
        else {
            if (options.form_header && (!form_header || !form_header.length)) {
                form_header = $(
                    '<div class="modal-header">' +
                        '<div class="header-title"></div>' +
                        '<div class="header-refresh-btn"></div>' +
                        '<div class="header-history-btn"></div>' +
                        '<div class="header-filters"></div>' +
                        '<div class="header-search"></div>' +
                        '<div class="header-print-btn"></div>' +
                        '<div class="header-close-btn"></div>' +
                    '</div>'
                );
            }
        }
        if (form_type) {
            if (this.master) {
                item_class = this.master.item_name + '-' + this.item_name + ' ' + form_type + '-form';
            }
            else {
                item_class = this.item_name + ' ' + form_type + '-form';
            }
        }
        options = $.extend({}, defaultOptions, options);
        if (!options.title) {
            options.title = '&nbsp';
        }

        if (container && container.length) {
            if (task.old_forms) {
                form.addClass('jam-form');
                form.addClass(item_class)
                if (options.form_header && form_type === 'edit') {
                    form.prepend(form_header);
                }
                return form
            }
            else {
                $form = $(
                    '<div class="form-frame ' + item_class + '" tabindex="-1">' +
                    '</div>'
                );
                if (options.form_header) {
                    $form.append(form_header);
                }
                if (!options.form_border) {
                    $form.addClass('no-border');
                }
            }
        }
        else {
            $form = $(
                '<div class="modal hide normal-modal-border ' + item_class + '" tabindex="-1" data-backdrop="static">' +
                '</div>'
            );
            if (options.form_header) {
                $form.append(form_header);
            }
            $doc = $(document);
            $form.on("mousedown", ".modal-header", function(e) {
                mouseX = e.screenX;
                mouseY = e.screenY;
                $doc.on("mousemove.modalform", captureMouseMove);
                $doc.on("mouseup.modalform", release_mouse_move);
            });

            $form.on("mousemove", ".modal-header", function(e) {
                $(this).css('cursor', 'move');
            });
        }
        this._set_form_options($form, options);
        $form.append(form);
        $form.addClass('jam-form');
        return $form;
    }

    _set_old_form_options(form, options, form_type) {
        var self = this,
            form_name = form_type + '_form',
            body,
            header = form.find('.modal-header'),
            title = header.find('.modal-title'),
            closeCaption = '',
            close_button = '',
            printCaption = '',
            print_button = '',
            history_button = '';
        if (options.close_button) {
            if (task.language && options.close_on_escape) {
                closeCaption = '&nbsp;' + task.language.close + ' - [Esc]</small>';
            }
            close_button = '<button type="button" id="close-btn" class="close" tabindex="-1" aria-hidden="true" style="padding: 0px 10px;">' +
                closeCaption + ' ×</button>';
        }
        if (task.language && options.print) {
            printCaption = '&nbsp;' + task.language.print + ' - [Ctrl-P]</small>',
                print_button = '<button type="button" id="print-btn" class="close" tabindex="-1" aria-hidden="true" style="padding: 0px 10px;">' +
                printCaption + '</button>';
        }
        if (options.history_button && this.keep_history && task.history_item) {
            history_button = '<i id="history-btn" class="icon-film" style="float: right; margin: 5px;"></i>';
        }

        if (!title.text().length) {
            title = ('<h4 class="modal-title">' + options.title + '</h4>');
        } else {
            title.html(options.title);
        }
        header.empty();
        header.append(close_button + history_button + print_button);
        header.append(title);
        header.find("#close-btn").css('cursor', 'default').click(function(e) {
            if (form_name) {
                self._close_form(form_type);
            }
        });
        header.find('#print-btn').css('cursor', 'default').click(function(e) {
            if (form.find(".form-body").length) {
                body = form.find(".form-body");
            }
            else if (form.find(".modal-body").length) {
                body = form.find(".modal-body");
            }
            self.print_html(body);
        });
        header.find('#history-btn').css('cursor', 'default').click(function(e) {
            self.show_history();
        });
    }

    _set_form_options(form, options, form_type) {
        var self = this,
            form_name = form_type + '_form',
            header = form.find('.modal-header'),
            close_caption = '',
            close_button = '',
            print_caption = '',
            print_button = '',
            filter_count = 0,
            body;
        if (task.old_forms) {
            this._set_old_form_options(form, options, form_type);
            return;
        }
        if (!options.title) {
            options.title = this.item_caption;
        }

        if (options.close_button) {
            if (task.language && options.close_on_escape) {
                close_caption = '&nbsp;' + task.language.close + ' - [Esc]</small>';
            }
            close_button = '<button type="button" id="close-btn" class="close" tabindex="-1" aria-hidden="true" style="padding: 0px 10px;">' +
                close_caption + ' ×</button>';
            header.find('.header-close-btn').html(close_button);
        }
        else {
            header.find('.header-close-btn').hide();
        }

        if (task.language && options.print) {
            print_caption = '&nbsp;' + task.language.print + ' - [Ctrl-P]</small>',
                print_button = '<button type="button" id="print-btn" class="close" tabindex="-1" aria-hidden="true" style="padding: 0px 10px;">' +
                print_caption + '</button>';
            header.find('.header-print-btn').html(print_button);
        }
        else {
            header.find('.header-print-btn').hide();
        }

        if (options.history_button && this.keep_history && task.history_item) {
            header.find('.header-history-btn')
                .html('<a class="btn header-btn history-btn" href="#"><i class="icon-film"></i></a>')
                .tooltip({placement: 'bottom', title: task.language.view_rec_history, trigger: 'hover'});
            header.find('.history-btn').css('cursor', 'default').click(function(e) {
                e.preventDefault();
                self.show_history();
            });
        }
        else {
            header.find('.header-history-btn').hide();
        }

        if (!this.virtual_table && options.refresh_button) {
            header.find('.header-refresh-btn')
                .html('<a class="btn header-btn refresh-btn" href="#"><i class="icon-refresh"></i></a>')
                .tooltip({placement: 'bottom', title: task.language.refresh_page, trigger: 'hover'});
            header.find(".refresh-btn").css('cursor', 'default').click(function(e) {
                e.preventDefault();
                self.refresh(true);
            });
        }
        else {
            header.find('.header-refresh-btn').hide();
        }

        if (this.each_filter) {
            this.each_filter(function(f) {
                if (f.visible) {
                    filter_count += 1;
                }
            })
        }
        if (options.enable_filters && filter_count) {
            header.find('.header-filters')
                .html(
                    '<a class="btn header-btn header-filters-btn" href="#">' +
                    //~ '<i class="icon-filter"></i> ' +
                    task.language.filters + '</a>' +
                    '<span class="filters-text pull-left"></span>'
                )
            header.find('.header-filters-btn')
                .tooltip({placement: 'bottom', title: task.language.set_filters, trigger: 'hover'})
                .css('cursor', 'default')
                .click(function(e) {
                    e.preventDefault();
                    self.create_filter_form();
                });
        }

        if (!options.enable_search) {
            header.find('.header-search').hide();
        }

        header.find('.header-title').html('<h4 class="modal-title">' + options.title + '</h4>')

        header.find("#close-btn").css('cursor', 'default').click(function(e) {
            if (form_name) {
                self._close_form(form_type);
            }
        });
        header.find('#print-btn').css('cursor', 'default').click(function(e) {
            if (form.find(".form-body").length) {
                body = form.find(".form-body");
            }
            else if (form.find(".modal-body").length) {
                body = form.find(".modal-body");
            }
            self.print_html(body);
        });

        if (options.form_header) {
            header.css('display', 'flex');
        }
        else {
            header.remove();
        }
    }

    init_filters() {
        var self = this;
        this._on_filters_applied_internal = function() {
            if (self.view_form) {
                self.view_form.find(".filters-text").html(self.get_filter_html());
            }
        };
    }

    init_search() {

        function can_search_on_field(field) {
            if (field && field.lookup_type !== "boolean" &&
                field.lookup_type !== "image" &&
                field.lookup_type !== "date" &&
                field.lookup_type !== "datetime") {
                return true;
            }
        }

        function isCharCode(code) {
            if (code >= 48 && code <= 57 || code >= 96 && code <= 105 ||
                code >= 65 && code <= 90 || code >= 186 && code <= 192 ||
                code >= 219 && code <= 222) {
                return true;
            }
        }

        function do_search(item, input) {
            var field = item.field_by_name(search_field),
                search_type = 'contains_all';
            item.set_order_by(item.view_options.default_order);
            item._search_params = item.search(search_field, input.val(), search_type, true, function() {
                input.css('font-weight', 'bold');
            });
        }

        var timeOut,
            self = this,
            i,
            counter = 0,
            search_form,
            search,
            fields_menu,
            li,
            captions = [],
            field,
            field_btn,
            search_field,
            fields = [];

        if (this.view_options.search_field) {
            search_field = this.view_options.search_field;
        }
        for (i = 0; i < this.view_options.fields.length; i++) {
            field = this.field_by_name(this.view_options.fields[i]);
            if (field && can_search_on_field(field)) {
                fields.push([field.field_name, field.field_caption])
                if (!search_field) {
                    search_field = this.view_options.fields[i];
                }
                counter += 1;
                if (counter > 20) {
                    break;
                }
            }
        }
        if (search_field) {
            let input_class = 'input-medium';
            this.view_form.find('#search-form').remove() // for compatibility with previous verdions
            this.view_form.find('.header-search').append(
                '<form id="search-form" class="form-inline pull-right">' +
                    '<div class="btn-group">' +
                        '<button class="field-btn btn btn-small">' + this.field_by_name(search_field).field_caption + '</button>' +
                        '<button class="btn btn-small dropdown-toggle" data-toggle="dropdown">' +
                            '<span class="caret"></span>' +
                        '</button>' +
                        '<ul class="dropdown-menu">' +
                        '</ul>' +
                    '</div>' +
                    ' <input id="search-input" type="text" class="' + input_class + ' search-query" autocomplete="off">' +
                '</form>');
            search = this.view_form.find("#search-input");
            field_btn = this.view_form.find('#search-form .field-btn');
            field_btn.click(function(e) {
                e.preventDefault();
                search.focus();
            });
            fields_menu = this.view_form.find('#search-form .dropdown-menu')
            for (i = 0; i < fields.length; i++) {
                li = $('<li><a href="#">' + fields[i][1] + '</a></li>')
                li.data('field', fields[i]);
                li.click(function(e) {
                    var field = $(this).data('field');
                    e.preventDefault();
                    search_field = field[0];
                    field_btn.text(field[1]);
                    search.focus();
                    search.val('');
                    do_search(self, search);
                });
                fields_menu.append(li)
            }
            search.on('input', function() {
                var input = $(this);
                input.css('font-weight', 'normal');
                clearTimeout(timeOut);
                timeOut = setTimeout(
                    function() {
                        do_search(self, input);
                    },
                    500
                );
            });
            search.keyup(function(e) {
                var code = e.which;
                if (code === 13) {
                    e.preventDefault();
                }
                //~ else if (code === 40 || code === 27) {
                else if (code === 27) {
                    self.view_form.find('.dbtable.' + self.item_name + ' .inner-table').focus();
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            this.view_form.on('keydown', function(e) {
                var code = e.keyCode || e.which;
                if (code === 70 && e.ctrlKey) {
                    e.preventDefault();
                    search.focus();
                }
                return
            });
        }
        else {
            this.view_form.find("#search-form").hide();
        }
    }

    _process_key_event(form_type, event_type, e) {
        var i,
            form = this[form_type + '_form'],
            item_options = this[form_type + '_options'],
            forms;
        if (this._active_form(form_type)) {
            if (form._form_disabled) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            else {
                if (e.which !== 116) { //F5
                    e.stopPropagation();
                }
                this._process_event(form_type, event_type, e);
                forms = form.find('.jam-form');
                forms.each(function() {
                    var form = $(this),
                        options = form.data('options');
                    if (form.is(":visible")) {
                        options.item._process_event(options.form_type, event_type, e);
                    }
                });
            }
        }
    }

    _process_event(form_type, event_type, e) {
        var event = 'on_' + form_type + '_form_' + event_type,
            can_close,
            index;
        if (event_type === 'close_query') {
            if (this[event]) {
                can_close = this[event].call(this, this);
            }
            if (!(this.master || this.master_field) && can_close === undefined && this.owner[event]) {
                can_close = this.owner[event].call(this, this);
            }
            if (can_close === undefined && this.task[event]) {
                can_close = this.task[event].call(this, this);
            }
            return can_close;
        }
        else if (event_type === 'keyup' || event_type === 'keydown') {
            if (this[event]) {
                if (this[event].call(this, this, e)) return;
            }
            if (!(this.master || this.master_field) && this.owner[event]) {
                if (this.owner[event].call(this, this, e)) return;
            }
            if (this.task[event]) {
                if (this.task[event].call(this, this, e)) return;
            }
        }
        else {
            if (this.task[event]) {
                if (this.task[event].call(this, this)) return;
            }
            if (!(this.master || this.master_field) && this.owner[event]) {
                if (this.owner[event].call(this, this)) return;
            }
            if (this[event]) {
                if (this[event].call(this, this)) return;
            }
        }
        if (form_type === 'edit') {
            if (event_type === 'shown') {
                task._edited_items.push(this);
            }
            else if (event_type === 'closed') {
                index = task._edited_items.indexOf(this)
                if (index > -1) {
                  task._edited_items.splice(index, 1);
                }
            }
        }
    }

    _resize_form(form_type, container) {
        var form_name = form_type + '_form',
            form = this[form_name],
            item_options = this[form_type + '_options'],
            parent_width,
            width = item_options.width,
            container_width;
        parent_width = container.parent().parent().innerWidth();
        container.width(parent_width);
        container_width = container.innerWidth() -
            parseInt(form.css('border-left-width'), 10) -
            parseInt(form.css('border-right-width'), 10);
        if (!width) {
            width = form.width()
        }
        if (width < container_width) {
            form.width(width);
        }
        else {
            form.width(container_width);
        }
        this.resize_controls();
    }

    _active_form(form_type) {
        var self = this,
            form_name = form_type + '_form',
            form = this[form_name],
            cur_form = $(document.activeElement).closest('.jam-form.' + form_type + '-form'),
            result = false;
        if (cur_form.length) {
            if (form.get(0) === cur_form.get(0)) {
                result = true;
            }
        }
        else {
            $('.jam-form').each(function() {
                var form = $(this),
                    options;
                if (form.is(':visible') && form.hasClass(form_type + '-form') &&
                    form.hasClass(self.item_name)) {
                    options = form.data('options');
                    if (self._tab_info) {
                        if (self._tab_info.tab_id === options.item_options.tab_id) {
                            result = true;
                            return false;
                        }
                    }
                    else {
                        result = true;
                        return false;
                    }

                }
            })
        }
        return result;
    }

    _create_form(form_type, container) {
        var self = this,
            form,
            form_name = form_type + '_form',
            options = {},
            item_options = this[form_type + '_options'],
            key_suffix,
            resize_timeout,
            width;

        options.item = this;
        options.form_type = form_type;
        options.item_options = item_options;
        options.item_options.form_type = form_type;
        key_suffix = form_name + '.' + this.item_name;
        if (item_options.tab_id) {
            key_suffix += '.' + item_options.tab_id;
        }
        if (container) {
            container.empty();
            this.task.default_content_visible = false;
        }
        form = $("<div></div>").append(this.find_template(form_type, item_options));
        form = this._create_form_header(form, item_options, form_type, container);
        this[form_name] = form
        if (form) {
            options.form = form;
            form.data('options', options);
            form.tabindex = 1;
            if (container) {
                $(window).on("keyup." + key_suffix, function(e) {
                    if (e.which === 27 && item_options.close_on_escape) {
                        if (self._active_form(form_type)) {
                            self._close_form(form_type);
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        }
                    }
                    else {
                        self._process_key_event(form_type, 'keyup', e);
                    }
                });
                $(window).on("keydown." + key_suffix, function(e) {
                    self._process_key_event(form_type, 'keydown', e)
                });
                container.append(form);
                this[form_name].bind('destroyed', function() {
                    self._close_modeless_form(form_name);
                });
                this._process_event(form_type, 'created');
                this._set_form_options(form, item_options, form_type);
                this._focus_form(form);
                if (form_type === 'edit') {
                    this._resize_form(form_type, container);
                    $(window).on("resize." + key_suffix, function(e) {
                        clearTimeout(resize_timeout);
                        resize_timeout = setTimeout(
                            function() {
                                self._resize_form(form_type, container);
                            },
                            100
                        );
                    })
                }
                this._process_event(form_type, 'shown');
            } else {
                if (form.hasClass("modal")) {
                    form.on("show", function(e) {
                        if (e.target === self[form_name].get(0)) {
                            e.stopPropagation();
                            self._process_event(form_type, 'created');
                            self._set_form_options(self[form_name], item_options, form_type);
                        }
                    });
                    form.on("shown", function(e) {
                        if (e.target === self[form_name].get(0)) {
                            self._focus_form(self[form_name]);
                            if (form_type === 'edit') {
                                self.resize_controls();
                            }
                            e.stopPropagation();
                            self._process_event(form_type, 'shown');
                        }
                    });
                    form.on("hide", function(e) {
                        if (e.target === self[form_name].get(0)) {
                            var canClose = true;
                            e.stopPropagation();
                            canClose = self._process_event(form_type, 'close_query');
                            if (canClose === false) {
                                e.preventDefault();
                                self[form_name].data('_closing', false);
                            }
                        }
                    });
                    form.on("hidden", function(e) {
                        if (e.target === self[form_name].get(0)) {
                            e.stopPropagation();
                            self._process_event(form_type, 'closed');
                            self[form_name].remove();
                            self[form_name] = undefined;
                        }
                    });
                    form.on("keydown." + key_suffix, function(e) {
                        self._process_key_event(form_type, 'keydown', e)
                    });
                    form.on("keyup." + key_suffix, function(e) {
                        self._process_key_event(form_type, 'keyup', e)
                    });

                    form.modal({
                        item: this,
                        form_name: form_name,
                        item_options: item_options
                    });
                }
            }
        }
    }

    _close_modeless_form(form_type) {
        var self = this,
            form_name = form_type + '_form';
        if (this[form_name]) {
            this._close_form(form_type);
        }
        if (this[form_name]) {
            this[form_name].bind('destroyed', function() {
                self._close_modeless_form(form_type);
            });
            throw new Error(this.item_name + " - can't close form");
        }
    }

    _close_form(form_type) {
        var self = this,
            form_name = form_type + '_form',
            form = this[form_name],
            options,
            canClose,
            key_suffix;

        if (form) {
            options = form.data('options'),
            key_suffix = form_name + '.' + this.item_name;
            if (options.item_options.tab_id) {
                key_suffix += '.' + options.item_options.tab_id;
            }
            form.data('_closing', true);
            form.find('.jam-form').data('_closing', true);
            if (form.hasClass('modal')) {
                setTimeout(
                    function() {
                        form.modal('hide');
                    },
                    100
                );
            } else {
                canClose = self._process_event(options.form_type, 'close_query');
                if (canClose !== false) {
                    $(window).off("keydown." + key_suffix);
                    $(window).off("keyup." + key_suffix);
                    $(window).off("resize." + key_suffix);
                    this[form_name] = undefined;
                    if (this._tab_info) {
                        this.task.close_tab(this._tab_info.container, this._tab_info.tab_id);
                        this._tab_info = undefined;
                    }
                    self._process_event(options.form_type, 'closed');
                    form.remove();
                    let forms = $(".jam-form:not('.modal')");
                    if (forms.length === 0) {
                        this.task.default_content_visible = true;
                    }
                }
            }
        }
    }

    update_form(form) {
        form.modal('layout');
    }

    disable_edit_form() {
        this._disable_form(this.edit_form);
    }

    enable_edit_form() {
        this._enable_form(this.edit_form);
    }

    edit_form_disabled() {
        return this.edit_form._form_disabled;
    }

    _disable_form(form) {
        if (form) {
            form.css('pointer-events', 'none');
            form._form_disabled = true;
        }
    }

    _enable_form(form) {
        if (form) {
            form.css('pointer-events', 'auto');
            form._form_disabled = false;
        }
    }

    print_html(html) {
        var win = window.frames["dummy"],
            css = $("link[rel='stylesheet']"),
            body,
            head = '<head>';
        css.each(function(i, e) {
            head += '<link href="' + e.href + '" rel="stylesheet">';
        });
        head += '</head>';
        body = html.clone();
        win.document.write(head + '<body onload="window.print()">' + body.html() + '</body>');
        win.document.close();
    }

    alert(message, options) {
        var default_options = {
                type: 'info',
                header: undefined,
                align: 'right',
                replace: true,
                pulsate: true,
                click_close: true,
                body_click_hide: false,
                show_header: true,
                duration: 5,
                timeout: 0
            },
            pos = 0,
            width = 0,
            container = $('body'),
            $alert;
        options = $.extend({}, default_options, options);
        if (!options.replace && $('body').find('.alert-absolute').length) {
            return;
        }
        if (!options.header) {
            options.header = task.language[options.type];
        }
        if (!options.header) {
            options.show_header = false;
        }
        $alert = $(
        '<div class="alert alert-block alert-absolute">' +
          '<button type="button" class="close" data-dismiss="alert">&times;</button>' +
          '<h4>' + options.header + '</h4>' +
          '<p>' + message + '</p>' +
        '</div>'
        );
        if (task.forms_container && task.forms_container.length) {
            container = task.forms_container;
        }
        else {
            $('body').children().each(function() {
                var $this = $(this);
                if ($this.width() > width && $this.css('z-index') === 'auto') {
                    width = $this.width();
                    container = $this;
                }
            });
        }
        $('body').find('.alert-absolute').remove();
        if (options.body_click_hide) {
            $('body')
                .off('mouseup.alert-absolute')
                .on('mouseup.alert-absolute', function(e) {
                $('body').find('.alert-absolute').remove();
            });
        }
        $(window)
            .off('resize.alert-absolute')
            .on('resize.alert-absolute', function(e) {
            $('body').find('.alert-absolute').remove();
        })

        $alert.addClass('alert-' + options.type)
        if (options.pulsate) {
            $alert.find('h4').addClass('pulsate');
        }
        if (!options.show_header) {
            $alert.find('h4').hide();
        }
        $('body').append($alert);
        $alert.css('top', 0);
        if (options.align === 'right') {
            if (container) {
                pos = $(window).width() - (container.offset().left + container.width())
            }
            $alert.css('right', pos);
        }
        else {
            if (container) {
                pos = container.offset().left;
            }
            $alert.css('left', pos);
        }
        $alert.show();
        if (options.duration) {
            setTimeout(function() {
                    $alert.hide(100);
                    setTimeout(function() {
                            $alert.remove();
                        },
                        100
                    );
                },
                options.duration * 1000
            );
        }
    }

    alert_error(message, options) {
        options = $.extend({}, options);
        options.type = 'error';
        this.alert(message, options);
    }

    alert_success(message, options) {
        options = $.extend({}, options);
        options.type = 'success';
        this.alert(message, options);
    }

    message(mess, options) {
        var self = this,
            default_options = {
                title: '',
                width: 400,
                form_header: true,
                height: undefined,
                margin: undefined,
                buttons: undefined,
                default_button: undefined,
                print: false,
                text_center: false,
                button_min_width: 100,
                center_buttons: false,
                close_button: true,
                close_on_escape: true,
                focus_last_btn: false,
                hide: true
            },
            buttons,
            key,
            el = '',
            $element,
            $modal_body,
            $button = $('<button type="button" class="btn">OK</button>'),
            timeOut;

        if (mess instanceof jQuery) {
            mess = mess.clone()
        }
        options = $.extend({}, default_options, options);
        buttons = options.buttons;

        el = '<div class="modal-body"></div>';
        if (!this.is_empty_obj(buttons)) {
            el += '<div class="modal-footer"></div>';
        }

        $element = this._create_form_header($(el), options);

        $modal_body = $element.find('.modal-body');

        if (options.margin) {
            $modal_body.css('margin', options.margin);
        }

        $modal_body.html(mess);

        if (!options.title) {
            $element.find('.modal-header').remove();
        }

        if (options.text_center) {
            $modal_body.html(mess).addClass("text-center");
        }
        if (options.center_buttons) {
            $element.find(".modal-footer").css("text-align", "center");
        }

        $element.find("#close-btn").click(function(e) {
            $element.modal('hide');
        });

        for (key in buttons) {
            if (buttons.hasOwnProperty(key)) {
                $element.find(".modal-footer").append(
                    $button.clone()
                    .data('key', key)
                    .css("min-width", options.button_min_width)
                    .html(key)
                    .click(function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var key = $(this).data('key');
                        setTimeout(function() {
                                try {
                                    if (buttons[key]) {
                                        buttons[key].call(self);
                                    }
                                }
                                catch (e) {
                                    console.error(e);
                                }
                                if (options.hide) {
                                    $element.modal('hide');
                                }
                            },
                            100
                        );
                    })
                );
            }
        }

        $element.on("show hide hidden", function(e) {
            if (e.target === $element.get(0)) {
                e.stopPropagation();
            }
        });

        $element.on("shown", function(e) {
            if (e.target === $element.get(0)) {
                self._focus_form($element);
                if (options.focus_last_btn) {
                    $element.find(".modal-footer button.btn:last").focus();
                }
                e.stopPropagation();
            }
        });

        $element.on("keyup keydown", function(e) {
            var event;
            e.stopPropagation();
            if (e.which === 37 || e.which === 39) {
                event = jQuery.Event(e.type);
                event.which = e.which + 1;
                $(e.target).trigger(event);
            }
            else if (e.which === 80 && e.ctrlKey) {
                e.preventDefault();
                self.print_html($element.find(".modal-body"));
            }
        });

        $element.modal({
            width: options.width,
            height: options.height,
            keyboard: options.close_on_escape
        });
        return $element;
    }

    question(mess, yesCallback, noCallback, options) {
        var buttons = {},
            default_options = {
                buttons: buttons,
                margin: "40px 20px",
                text_center: true,
                center_buttons: true,
                focus_last_btn: true
            };
        options = $.extend({}, default_options, options);
        buttons[task.language.yes] = yesCallback;
        buttons[task.language.no] = noCallback;
        return this.message(mess, options);
    }

    warning(mess, callback, options) {
        var buttons = {"OK": callback},
            default_options = {
                buttons: buttons,
                margin: "40px 20px",
                text_center: true,
                center_buttons: true,
                focus_last_btn: true,
            }
        options = $.extend({}, default_options, options);
        return this.message(mess, options);
    }

    show_message(mess, options) {
        return this.message(mess, options);
    }

    hide_message($element) {
        $element.modal('hide');
    }

    yes_no_cancel(mess, yesCallback, noCallback, cancelCallback) {
        var buttons = {};
        buttons[task.language.yes] = yesCallback;
        buttons[task.language.no] = noCallback;
        buttons[task.language.cancel] = cancelCallback;
        return this.message(mess, {
            buttons: buttons,
            margin: "40px 20px",
            text_center: true,
            width: 500,
            center_buttons: true,
            focus_last_btn: true
        });
    }

    display_history(hist) {
        var self = this,
            html = '',
            acc_div = $('<div class="accordion history-accordion" id="history_accordion">'),
            item,
            master,
            lookups = {},
            lookup_keys,
            lookup_fields,
            keys,
            fields,
            where,
            lookup_item,
            mess;
        if (self.master) {
            master = self.master.copy({handlers: false});
            item = master.item_by_ID(self.ID);
            master.open({open_empty: true});
            master.append();
        }
        else {
            item = self.copy({handlers: false, details: false});
        }
        item.open({open_empty: true});
        item.append();
        hist.each(function(h) {
            var acc = $(
                '<div class="accordion-group history-group">' +
                    '<div class="accordion-heading history-heading">' +
                        '<a class="accordion-toggle history-toggle" data-toggle="collapse" data-parent="#history_accordion" href="#history_collapse' + h.rec_no + '">' +
                        '</a>' +
                    '</div>' +
                    '<div id="history_collapse' + h.rec_no + '" class="accordion-body collapse">' +
                        '<div class="accordion-inner history-inner">' +
                        '</div>' +
                    '</div>' +
                 '</div>'
                ),
                i,
                user = '',
                content = '',
                old_value,
                new_value,
                val_index,
                field,
                field_name,
                changes,
                operation,
                field_arr;
            changes = h.changes.value;
            if (changes && changes[0] === '0') {
                changes = changes.substring(1);
                changes = JSON.parse(changes);
            }
            if (h.operation.value === consts.RECORD_DELETED) {
                content = '<p>Record deleted</p>'
            }
            else if (changes) {
                field_arr = changes;
                if (field_arr) {
                    for (i = 0; i < field_arr.length; i++) {
                        field = item.field_by_ID(field_arr[i][0]);
                        val_index = 1;
                        if (field_arr[i].length === 3) {
                            val_index = 2;
                        }
                        if (field && !field.system_field()) {
                            field_name = field.field_caption;
                            if (field.lookup_item) {
                                if (!lookups[field.lookup_item.ID]) {
                                    lookups[field.lookup_item.ID] = [];
                                }
                                field.data = field_arr[i][val_index];
                                new_value = field.value;
                                if (new_value) {
                                    lookups[field.lookup_item.ID].push([field.lookup_field, new_value]);
                                    new_value = '<span class="' + field.lookup_field + '_' + new_value + '">' + task.language.value_loading + '</span>'
                                }
                            }
                            else {
                                field.data = field_arr[i][val_index];
                                new_value = field.sanitized_text;
                                if (field.data === null) {
                                    new_value = ' '
                                }
                            }
                            if (h.operation.value === consts.RECORD_INSERTED) {
                                content += '<p>' + self.task.language.field + ' <b>' + field_name + '</b>: ' +
                                    self.task.language.new_value + ': <b>' + new_value + '</b></p>';
                            }
                            else if (h.operation.value === consts.RECORD_MODIFIED) {
                                content += '<p>' + self.task.language.field + ' <b>' + field_name + '</b>: ' +
                                    self.task.language.new_value + ': <b>' + new_value + '</b></p>';
                            }
                        }
                    }
                }
            }
            if (h.user.value) {
                user = self.task.language.by_user + ' ' + h.user.value;
            }
            if (h.operation.value === consts.RECORD_INSERTED) {
                operation = self.task.language.created;
            }
            else if (h.operation.value === consts.RECORD_MODIFIED ||
                h.operation.value === consts.RECORD_DETAILS_MODIFIED) {
                operation = self.task.language.modified;
            }
            else if (h.operation.value === consts.RECORD_DELETED) {
                operation = self.task.language.deleted;
            }

            acc.find('.accordion-toggle').html(h.date.format_date_to_string(h.date.value, '%d.%m.%Y %H:%M:%S') + ': ' +
                operation + ' ' + user);
            acc.find('.accordion-inner').html(content);
            if (h.rec_no === 0) {
                acc.find('.accordion-body').addClass('in');
            }
            acc_div.append(acc)
        })
        if (hist.record_count()) {
            html = acc_div;
        }
        mess = self.task.message(html, {width: 700, height: 600,
            title: hist.item_caption + ': ' + self.item_caption, footer: false, print: true});
        acc_div = mess.find('#history_accordion.accordion');
        for (var ID in lookups) {
            if (lookups.hasOwnProperty(ID)) {
                lookup_item = self.task.item_by_ID(parseInt(ID, 10));
                if (lookup_item) {
                    lookup_item = lookup_item.copy({handlers: false});
                    lookup_keys = {};
                    lookup_fields = {};
                    lookup_fields[lookup_item._primary_key] = true;
                    for (var i = 0; i < lookups[ID].length; i++) {
                        lookup_fields[lookups[ID][i][0]] = true;
                        lookup_keys[lookups[ID][i][1]] = true;
                    }
                    keys = [];
                    for (var key in lookup_keys) {
                        if (lookup_keys.hasOwnProperty(key)) {
                            keys.push(parseInt(key, 10));
                        }
                    }
                    fields = [];
                    for (var field in lookup_fields) {
                        if (lookup_fields.hasOwnProperty(field)) {
                            fields.push(field);
                        }
                    }
                    where = {}
                    where[lookup_item._primary_key + '__in'] = keys
                    lookup_item.open({where: where, fields: fields}, function() {
                        var lookup_item = this;
                        lookup_item.each(function(l) {
                            l.each_field(function(f) {
                                if (!f.system_field()) {
                                    acc_div.find("." + f.field_name + '_' + l._primary_key_field.value).text(f.sanitized_text);
                                }
                            });
                        });
                    })
                }
            }
        }
    }

    show_history() {
        var self = this,
            item_id = this.ID,
            hist = this.task.history_item.copy();
        if (!this.rec_count) {
            this.warning(task.language.no_record);
            return;
        }
        if (this.master) {
            item_id = this.prototype_ID;
        }
        hist.set_where({item_id: item_id, item_rec_id: this.field_by_name(this._primary_key).value})
        hist.set_order_by(['-date']);
        hist.open({limit: 100}, function() {
            self.display_history(hist);
        });
    }

    is_empty_obj(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                return false;
        }
        return true;
    }

    abort(message) {
        message = message ? ' - ' + message : '';
        throw new AbortError(this.item_name + message);
    }

    log_message(message) {
        if (this.task.settings.DEBUGGING) {
            message = message ? ' message: ' + message : '';
            console.log(this.item_name + message);
        }
    }

    round(num, dec) {
        if (dec === undefined) {
            dec = 0;
        }
        let result = Number(Math.round(Math.abs(num) + 'e' + dec) + 'e-' + dec);
        if (isNaN(result)) {
            result = 0;
        }
        if (num < 0) {
            result = -result;
        }
        return result;
    }

    str_to_int(str) {
        var result = parseInt(str, 10);
        if (isNaN(result)) {
            throw new Error(task.language.invalid_int.replace('%s', ''));
        }
        return result;
    }

    str_to_date(str) {
        return this.format_string_to_date(str, task.locale.D_FMT);
    }

    str_to_datetime(str) {
        return this.format_string_to_date(str, tasl.locale.D_T_FMT);
    }

    str_to_float(text) {
        var result;
        text = text.replace(task.locale.DECIMAL_POINT, ".")
        text = text.replace(task.locale.MON_DECIMAL_POINT, ".")
        result = parseFloat(text);
        if (isNaN(result)) {
            throw new Error(task.language.invalid_float.replace('%s', ''));
        }
        return result;
    }

    str_to_cur(val) {
        var result = '';
        if (val) {
            result = $.trim(val);
            result = result.replace(' ', '')
            if (task.locale.MON_THOUSANDS_SEP.length) {
                result = result.replace(new RegExp('\\' + task.locale.MON_THOUSANDS_SEP, 'g'), '');
            }
            if (task.locale.CURRENCY_SYMBOL) {
                result = $.trim(result.replace(task.locale.CURRENCY_SYMBOL, ''));
            }
            if (task.locale.POSITIVE_SIGN) {
                result = result.replace(task.locale.POSITIVE_SIGN, '');
            }
            if (task.locale.N_SIGN_POSN === 0 || task.locale.P_SIGN_POSN === 0) {
                result = result.replace('(', '').replace(')', '')
            }
            if (task.locale.NEGATIVE_SIGN && result.indexOf(task.locale.NEGATIVE_SIGN) !== -1) {
                result = result.replace(task.locale.NEGATIVE_SIGN, '')
                result = '-' + result
            }
            result = $.trim(result.replace(task.locale.MON_DECIMAL_POINT, '.'));
            result = parseFloat(result);
        }
        return result;
    }

    int_to_str(value) {
        if (value || value === 0) {
            return value.toString();
        }
        else {
            return '';
        }
    }

    float_to_str(value) {
        var str,
            i,
            result = '';
        if (value || value === 0) {
            str = ('' + value.toFixed(6)).replace(".", task.locale.DECIMAL_POINT);
            i = str.length - 1;
            for (; i >= 0; i--) {
                if ((str[i] === '0') && (result.length === 0)) {
                    continue;
                } else {
                    result = str[i] + result;
                }
            }
            if (result.slice(result.length - 1) === task.locale.DECIMAL_POINT) {
                result = result + '0';
            }
        }
        return result;
    }

    date_to_str(value) {
        if (value) {
            return this.format_date_to_string(value, task.locale.D_FMT);
        }
        else {
            return '';
        }
    }

    datetime_to_str(value) {
        if (value) {
            return this.format_date_to_string(value, task.locale.D_T_FMT);
        }
        else {
            return '';
        }
    }

    cur_to_str(value) {
        var point,
            dec,
            digits,
            i,
            d,
            count = 0,
            len,
            result = '';

        if (value || value === 0) {
            result = this.round(value, task.locale.FRAC_DIGITS).toFixed(task.locale.FRAC_DIGITS);
            if (isNaN(result[0])) {
                result = result.slice(1, result.length);
            }
            point = result.indexOf('.');
            dec = '';
            digits = result;
            if (point >= 0) {
                digits = result.slice(0, point);
                dec = result.slice(point + 1, result.length);
            }
            result = '';
            len = digits.length;
            for (i = 0; i < len; i++) {
                d = digits[len - i - 1];
                result = d + result;
                count += 1;
                if ((count % 3 === 0) && (i !== len - 1)) {
                    result = task.locale.MON_THOUSANDS_SEP + result;
                }
            }
            if (dec) {
                result = result + task.locale.MON_DECIMAL_POINT + dec;
            }
            if (value < 0) {
                if (task.locale.N_SIGN_POSN === 3) {
                    result = task.locale.NEGATIVE_SIGN + result;
                } else if (task.locale.N_SIGN_POSN === 4) {
                    result = result + task.locale.NEGATIVE_SIGN;
                }
            } else {
                if (task.locale.P_SIGN_POSN === 3) {
                    result = task.locale.POSITIVE_SIGN + result;
                } else if (task.locale.P_SIGN_POSN === 4) {
                    result = result + task.locale.POSITIVE_SIGN;
                }
            }
            if (task.locale.CURRENCY_SYMBOL) {
                if (value < 0) {
                    if (task.locale.N_CS_PRECEDES) {
                        if (task.locale.N_SEP_BY_SPACE) {
                            result = task.locale.CURRENCY_SYMBOL + ' ' + result;
                        } else {
                            result = task.locale.CURRENCY_SYMBOL + result;
                        }
                    } else {
                        if (task.locale.N_SEP_BY_SPACE) {
                            result = result + ' ' + task.locale.CURRENCY_SYMBOL;
                        } else {
                            result = result + task.locale.CURRENCY_SYMBOL;
                        }
                    }
                } else {
                    if (task.locale.P_CS_PRECEDES) {
                        if (task.locale.P_SEP_BY_SPACE) {
                            result = task.locale.CURRENCY_SYMBOL + ' ' + result;
                        } else {
                            result = task.locale.CURRENCY_SYMBOL + result;
                        }
                    } else {
                        if (task.locale.P_SEP_BY_SPACE) {
                            result = result + ' ' + task.locale.CURRENCY_SYMBOL;
                        } else {
                            result = result + task.locale.CURRENCY_SYMBOL;
                        }
                    }
                }
            }
            if (value < 0) {
                if (task.locale.N_SIGN_POSN === 0 && task.locale.NEGATIVE_SIGN) {
                    result = task.locale.NEGATIVE_SIGN + '(' + result + ')';
                } else if (task.locale.N_SIGN_POSN === 1) {
                    result = task.locale.NEGATIVE_SIGN + result;
                } else if (task.locale.N_SIGN_POSN === 2) {
                    result = result + task.locale.NEGATIVE_SIGN;
                }
            } else {
                if (task.locale.P_SIGN_POSN === 0 && task.locale.POSITIVE_SIGN) {
                    result = task.locale.POSITIVE_SIGN + '(' + result + ')';
                } else if (task.locale.P_SIGN_POSN === 1) {
                    result = task.locale.POSITIVE_SIGN + result;
                } else if (task.locale.P_SIGN_POSN === 2) {
                    result = result + task.locale.POSITIVE_SIGN;
                }
            }
        }
        return result;
    }

    parseDateInt(str, digits) {
        var result = parseInt(str.substring(0, digits), 10);
        if (isNaN(result)) {
            throw new Error(task.language.invalid_date.replace('%s', ''))
        }
        return result;
    }

    format_string_to_date(str, format) {
        var ch = '',
            substr = str,
            day, month, year,
            hour = 0,
            min = 0,
            sec = 0;
        if (str) {
            for (var i = 0; i < format.length; ++i) {
                ch = format.charAt(i);
                switch (ch) {
                    case "%":
                        break;
                    case "d":
                        day = this.parseDateInt(substr, 2);
                        substr = substr.slice(2);
                        break;
                    case "m":
                        month = this.parseDateInt(substr, 2);
                        substr = substr.slice(2);
                        break;
                    case "Y":
                        year = this.parseDateInt(substr, 4);
                        substr = substr.slice(4);
                        break;
                    case "H":
                        hour = this.parseDateInt(substr, 2);
                        substr = substr.slice(2);
                        break;
                    case "M":
                        min = this.parseDateInt(substr, 2);
                        substr = substr.slice(2);
                        break;
                    case "S":
                        sec = this.parseDateInt(substr, 2);
                        substr = substr.slice(2);
                        break;
                    default:
                        substr = substr.slice(ch.length);
                }
            }
            if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 24 ||
                min < 0 || min > 60 || sec < 0 || sec > 60) {
                    throw new Error(task.language.invalid_date.replace('%s', str));
            }
            return new Date(year, month - 1, day, hour, min, sec);
        }
        else {
            return str;
        }
    }

    leftPad(value, len, ch) {
        var result = value.toString();
        while (result.length < len) {
            result = ch + result;
        }
        return result;
    }

    format_date_to_string(date, format) {
        var ch = '',
            result = '';
        for (var i = 0; i < format.length; ++i) {
            ch = format.charAt(i);
            switch (ch) {
                case "%":
                    break;
                case "d":
                    result += this.leftPad(date.getDate(), 2, '0');
                    break;
                case "m":
                    result += this.leftPad(date.getMonth() + 1, 2, '0');
                    break;
                case "Y":
                    result += date.getFullYear();
                    break;
                case "H":
                    result += this.leftPad(date.getHours(), 2, '0');
                    break;
                case "M":
                    result += this.leftPad(date.getMinutes(), 2, '0');
                    break;
                case "S":
                    result += this.leftPad(date.getSeconds(), 2, '0');
                    break;
                default:
                    result += ch;
            }
        }
        return result;
    }

    sanitize_html(text) {
        let element = document.createElement('div');
        element.innerText = text;
        return element.innerHTML;
    }
}

export default AbsrtactItem
