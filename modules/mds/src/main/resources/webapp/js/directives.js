(function () {

    'use strict';

    var mds = angular.module('mds');

    /**
    * Show/hide details about a field by clicking on chevron icon in the first column in
    * the field table.
    */
    mds.directive('mdsExpandAccordion', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    target = angular.element('#field-tabs-{0}'.format(scope.$index));

                target.livequery(function () {
                    angular.element(this).on({
                        'show.bs.collapse': function () {
                            elem.find('i')
                                .removeClass('icon-chevron-right')
                                .addClass('icon-chevron-down');
                        },
                        'hide.bs.collapse': function () {
                            elem.find('i')
                                .removeClass('icon-chevron-down')
                                .addClass('icon-chevron-right');
                        }
                    });

                    target.expire();
                });
            }
        };
    });

    mds.directive('mdsHeaderAccordion', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    target = elem.find(".accordion-content");

                target.on({
                    show: function () {
                        elem.find('.accordion-icon')
                            .removeClass('icon-chevron-right')
                            .addClass('icon-chevron-down');
                    },
                    hide: function () {
                        elem.find('.accordion-icon')
                            .removeClass('icon-chevron-down')
                            .addClass('icon-chevron-right');
                    }
                });
            }
        };
    });

    /**
    * Ensure that if no field name has been entered it should be filled in by generating a camel
    * case name from the field display name. If you pass a 'new' value to this directive then it
    * will be check name of new field. Otherwise you have to pass a index to find a existing field.
    */
    mds.directive('mdsCamelCase', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                angular.element(element).focusout(function () {
                    var attrValue = attrs.mdsCamelCase,
                        field;

                    if (_.isEqual(attrValue, 'new')) {
                        field = scope.newField;
                    } else if (_.isNumber(+attrValue)) {
                        field = scope.fields && scope.fields[+attrValue];
                    }

                    if (field && field.basic && isBlank(field.basic.name)) {
                        scope.safeApply(function () {
                            field.basic.name = camelCase(field.basic.displayName);
                        });
                    }
                });
            }
        };
    });

    /**
    * Add ability to change model property mode on UI from read to write and vice versa. For this
    * to work there should be two tags next to each other. First tag (span, div) should present
    * property in the read mode. Second tag (input) should present property in the write mode. By
    * default property should be presented in the read mode and the second tag should be hidden.
    */
    mds.directive('mdsEditable', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    read = elem.find('span'),
                    write = elem.find('input');

                elem.click(function (e) {
                    e.stopPropagation();

                    read.hide();
                    write.show();
                    write.focus();
                });

                write.click(function (e) {
                    e.stopPropagation();
                });

                write.focusout(function () {
                    write.hide();
                    read.show();
                });
            }
        };
    });

    /**
    * Add a time picker (without date) to an element.
    */
    mds.directive('mdsTimePicker', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                angular.element(element).timepicker({
                    onSelect: function (timeTex) {
                        scope.safeApply(function () {
                            ngModel.$setViewValue(timeTex);
                        });
                    }
                });
            }
        };
    });

    /**
    * Add a datetime picker to an element.
    */
    mds.directive('mdsDatetimePicker', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                angular.element(element).datetimepicker({
                    showTimezone: true,
                    useLocalTimezone: true,
                    dateFormat: 'yy-mm-dd',
                    timeFormat: 'HH:mm z',
                    onSelect: function (dateTex) {
                        scope.safeApply(function () {
                            ngModel.$setViewValue(dateTex);
                        });
                    }
                });
            }
        };
    });

    /**
    * Add extra formating to textarea tag. ngModel have to be an array. Each element of array will
    * be splitted by new line on UI.
    */
    mds.directive('mdsSplitArray', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                ngModel.$parsers.push(function (text) {
                    return text.split("\n");
                });

                ngModel.$formatters.push(function (array) {
                    return array.join("\n");
                });
            }
        };
    });

    /**
    * Add "Item" functionality of "Connected Lists" control to the element. "Connected Lists Group"
    * is passed as a value of the attribute. If item is selected '.connected-list-item-selected-{group}
    * class is added.
    */
    mds.directive('connectedListTargetItem', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var jQelem = angular.element(element),
                    elem = element[0],
                    connectWith = jQelem.attr('connect-with'),
                    sourceContainer = $('.connected-list-source.' + connectWith),
                    targetContainer = $('.connected-list-target.' + connectWith);

                jQelem.addClass(connectWith);
                jQelem.addClass("target-item");

                jQelem.click(function() {
                    $(this).toggleClass("selected");
                    scope.$apply();
                });

                jQelem.dblclick(function() {
                    var e = $(this),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        index = parseInt(e.attr('item-index'), 10),
                        item = target[index];
                    e.removeClass("selected");
                    scope.$apply(function() {
                        source.push(item);
                        target.splice(index, 1);
                        sourceContainer.trigger('contentChange', [source]);
                        targetContainer.trigger('contentChange', [target]);
                    });
                });

                elem.addEventListener('dragenter', function(e) {
                    $(this).addClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragleave', function(e) {
                    $(this).removeClass('over');
                }, false);

                elem.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    return false;
                }, false);

                elem.addEventListener('dragstart', function(e) {
                    var item = $(this);
                    item.addClass('selected');
                    item.fadeTo(100, 0.4);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('origin', 'target');
                    e.dataTransfer.setData('index', item.attr('item-index'));
                    return false;
                }, false);

                elem.addEventListener('dragend', function(e) {
                    var item = $(this);
                    item.removeClass('selected');
                    item.fadeTo(100, 1.0);
                    return false;
                }, false);

                elem.addEventListener('drop', function(e) {
                    e.stopPropagation();
                    var itemOriginContainer = e.dataTransfer.getData('origin'),
                        index = parseInt(e.dataTransfer.getData('index'), 10),
                        thisIndex = parseInt($(this).attr('item-index'), 10),
                        source, target, item;

                    $(this).removeClass('over');
                    source = scope[sourceContainer.attr('connected-list-source')];
                    target = scope[targetContainer.attr('connected-list-target')];

                    if (itemOriginContainer === 'target') {
                        // movement inside one container
                        item = target[index];
                        if(thisIndex > index) {
                            thisIndex += 1;
                        }
                        scope.$apply(function() {
                            target[index] = 'null';
                            target.splice(thisIndex, 0, item);
                            target.splice(target.indexOf('null'), 1);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    } else if (itemOriginContainer === 'source') {
                        item = source[index];
                        scope.$apply(function() {
                            target.splice(thisIndex, 0, item);
                            source.splice(index, 1);
                            sourceContainer.trigger('contentChange', [source]);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    }
                    return false;
                }, false);

                jQelem.disableSelection();
            }
        };
    });

    mds.directive('connectedListSourceItem', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var jQelem = angular.element(element),
                    elem = element[0],
                    connectWith = jQelem.attr('connect-with'),
                    sourceContainer = $('.connected-list-source.' + connectWith),
                    targetContainer = $('.connected-list-target.' + connectWith);

                jQelem.addClass(connectWith);
                jQelem.addClass("source-item");

                jQelem.click(function() {
                    $(this).toggleClass("selected");
                    scope.$apply();
                });

                jQelem.dblclick(function() {
                    var e = $(this),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        index = parseInt(e.attr('item-index'), 10),
                        item = source[index];
                    e.removeClass("selected");
                    scope.$apply(function() {
                        target.push(item);
                        source.splice(index, 1);
                        sourceContainer.trigger('contentChange', [source]);
                        targetContainer.trigger('contentChange', [target]);
                    });
                });

                elem.addEventListener('dragenter', function(e) {
                    $(this).addClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragleave', function(e) {
                    $(this).removeClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    return false;
                }, false);

                elem.addEventListener('dragstart', function(e) {
                    var item = $(this);
                    item.addClass('selected');
                    item.fadeTo(100, 0.4);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('origin', 'source');
                    e.dataTransfer.setData('index', item.attr('item-index'));
                    return false;
                }, false);

                elem.addEventListener('dragend', function(e) {
                    var item = $(this);
                    item.removeClass('selected');
                    item.fadeTo(100, 1.0);
                    return false;
                }, false);

                elem.addEventListener('drop', function(e) {
                    e.stopPropagation();
                    var itemOriginContainer = e.dataTransfer.getData('origin'),
                        index = parseInt(e.dataTransfer.getData('index'), 10),
                        thisIndex = parseInt($(this).attr('item-index'), 10),
                        source, target, item;

                    $(this).removeClass('over');
                    source = scope[sourceContainer.attr('connected-list-source')];
                    target = scope[targetContainer.attr('connected-list-target')];
                    if (itemOriginContainer === 'source') {
                        // movement inside one container
                        item = source[index];
                        if(thisIndex > index) {
                            thisIndex += 1;
                        }
                        scope.$apply(function() {
                            source[index] = 'null';
                            source.splice(thisIndex, 0, item);
                            source.splice(source.indexOf('null'), 1);
                            sourceContainer.trigger('contentChange', [source]);
                        });
                    } else if (itemOriginContainer === 'target') {
                        item = target[index];
                        scope.$apply(function() {
                            source.splice(thisIndex, 0, item);
                            target.splice(index, 1);
                            sourceContainer.trigger('contentChange', [source]);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    }
                    return false;
                }, false);

                jQelem.disableSelection();
            }
        };
    });

    /**
    * Add "Source List" functionality of "Connected Lists" control to the element (container).
    * "Connected Lists Group" is passed as a value of the attribute. "onItemsAdd", "onItemsRemove"
    * and "onItemMove" callback functions are registered to handle items adding/removing/sorting.
    */
    mds.directive('connectedListSource', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var jQelem = angular.element(element), elem = element[0], connectWith = jQelem.attr('connect-with'),
                    onContentChange = jQelem.attr('on-content-change');

                jQelem.addClass('connected-list-source');
                jQelem.addClass(connectWith);

                if(typeof scope[onContentChange] === typeof Function) {
                    jQelem.on('contentChange', function(e, content) {
                        scope[onContentChange](content);
                    });
                }

                elem.addEventListener('dragenter', function(e) {
                    $(this).addClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragleave', function(e) {
                    $(this).removeClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    return false;
                }, false);

                elem.addEventListener('drop', function(e) {
                    e.stopPropagation();

                    var itemOriginContainer = e.dataTransfer.getData('origin'),
                        index = parseInt(e.dataTransfer.getData('index'), 10),
                        sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source, target, item;

                    $(this).removeClass('over');
                    source = scope[sourceContainer.attr('connected-list-source')];
                    target = scope[targetContainer.attr('connected-list-target')];
                    if (itemOriginContainer === 'source') {
                        // movement inside one container
                        item = source[index];
                        scope.$apply(function() {
                            source.splice(index, 1);
                            source.push(item);
                            sourceContainer.trigger('contentChange', [source]);
                        });
                    } else if (itemOriginContainer === 'target') {
                        item = target[index];
                        scope.$apply(function() {
                            source.push(item);
                            target.splice(index, 1);
                            sourceContainer.trigger('contentChange', [source]);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    }
                    return false;
                }, false);
            }
        };
    });

    /*
    * Add "Target List" functionality of "Connected Lists" control to the element (container).
    * "Connected Lists Group" is passed as a value of the attribute. "onItemsAdd", "onItemsRemove"
    * and "onItemMove" callback functions are registered to handle items adding/removing/sorting.
    */
    mds.directive('connectedListTarget', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var jQelem = angular.element(element), elem = element[0], connectWith = jQelem.attr('connect-with'),
                    onContentChange = jQelem.attr('on-content-change');

                jQelem.addClass('connected-list-target');
                jQelem.addClass(connectWith);

                if(typeof scope[onContentChange] === typeof Function) {
                    jQelem.on('contentChange', function(e, content) {
                        scope[onContentChange](content);
                    });
                }

                elem.addEventListener('dragenter', function(e) {
                    $(this).addClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragleave', function(e) {
                    $(this).removeClass('over');
                    return false;
                }, false);

                elem.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    return false;
                }, false);

                elem.addEventListener('drop', function(e) {
                    e.stopPropagation();

                    var itemOriginContainer = e.dataTransfer.getData('origin'),
                        index = parseInt(e.dataTransfer.getData('index'), 10),
                        sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source, target, item;

                    $(this).removeClass('over');
                    source = scope[sourceContainer.attr('connected-list-source')];
                    target = scope[targetContainer.attr('connected-list-target')];
                    if (itemOriginContainer === 'target') {
                        // movement inside one container
                        item = target[index];
                        scope.$apply(function() {
                            target.splice(index, 1);
                            target.push(item);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    } else if (itemOriginContainer === 'source') {
                        item = source[index];
                        scope.$apply(function() {
                            target.push(item);
                            source.splice(index, 1);
                            sourceContainer.trigger('contentChange', [source]);
                            targetContainer.trigger('contentChange', [target]);
                        });
                    }
                    return false;
                }, false);
            }
        };
    });

    /**
    * Add "Move selected to target" functionality of "Connected Lists" control to the element (button).
    * "Connected Lists Group" is passed as a value of the 'connect-with' attribute.
    */
    mds.directive('connectedListBtnTo', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    connectWith = elem.attr('connect-with');

                elem.click(function (e) {
                    var sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        selectedElements = sourceContainer.children('.selected'),
                        selectedIndices = [], selectedItems = [];

                        if(selectedElements.size() > 0) {
                            selectedElements.each(function() {
                                 var index = parseInt($(this).attr('item-index'), 10),
                                     item = source[index];
                                 $(this).removeClass('selected');
                                 selectedIndices.push(index);
                                 selectedItems.push(item);
                            });
                            scope.$apply(function() {
                                 angular.forEach(selectedIndices.reverse(), function(itemIndex) {
                                     source.splice(itemIndex, 1);
                                 });
                                 angular.forEach(selectedItems, function(item) {
                                     target.push(item);
                                 });
                                 sourceContainer.trigger('contentChange', [source]);
                                 targetContainer.trigger('contentChange', [target]);
                            });
                        }
                });
            }
        };
    });

    /**
    * Add "Move all to target" functionality of "Connected Lists" control to the element (button).
    * "Connected Lists Group" is passed as a value of the 'connect-with' attribute.
    */
    mds.directive('connectedListBtnToAll', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    connectWith = elem.attr('connect-with');

                elem.click(function (e) {
                    var sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        selectedItems = sourceContainer.children();

                        if(selectedItems.size() > 0) {
                            scope.$apply(function() {
                                 angular.forEach(source, function(item) {
                                     target.push(item);
                                 });
                                 source.length = 0;
                                 sourceContainer.trigger('contentChange', [source]);
                                 targetContainer.trigger('contentChange', [target]);
                            });
                        }
                });
            }
        };
    });

    /**
    * Add "Move selected to source" functionality of "Connected Lists" control to the element (button).
    * "Connected Lists Group" is passed as a value of the 'connect-with' attribute.
    */
    mds.directive('connectedListBtnFrom', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    connectWith = elem.attr('connect-with');

                elem.click(function (e) {
                    var sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        selectedElements = targetContainer.children('.selected'),
                        selectedIndices = [], selectedItems = [];

                        if(selectedElements.size() > 0) {
                            selectedElements.each(function() {
                                 var index = parseInt($(this).attr('item-index'), 10),
                                     item = target[index];
                                 $(this).removeClass('selected');
                                 selectedIndices.push(index);
                                 selectedItems.push(item);
                            });
                            scope.$apply(function() {
                                 angular.forEach(selectedIndices.reverse(), function(itemIndex) {
                                     target.splice(itemIndex, 1);
                                 });
                                 angular.forEach(selectedItems, function(item) {
                                     source.push(item);
                                 });
                                 sourceContainer.trigger('contentChange', [source]);
                                 targetContainer.trigger('contentChange', [target]);
                            });
                        }
                });
            }
        };
    });

    /**
    * Add "Move all to source" functionality of "Connected Lists" control to the element (button).
    * "Connected Lists Group" is passed as a value of the 'connect-with' attribute.
    */
    mds.directive('connectedListBtnFromAll', function () {
        return {
            restrict: 'A',
            link: function (scope, element) {
                var elem = angular.element(element),
                    connectWith = elem.attr('connect-with');

                elem.click(function (e) {
                    var sourceContainer = $('.connected-list-source.' + connectWith),
                        targetContainer = $('.connected-list-target.' + connectWith),
                        source = scope[sourceContainer.attr('connected-list-source')],
                        target = scope[targetContainer.attr('connected-list-target')],
                        selectedItems = targetContainer.children();

                        if(selectedItems.size() > 0) {
                            scope.$apply(function() {
                                 angular.forEach(target, function(item) {
                                    source.push(item);
                                 });
                                 target.length = 0;
                                 sourceContainer.trigger('contentChange', [source]);
                                 targetContainer.trigger('contentChange', [target]);
                            });
                        }
                });
            }
        };
    });

    /**
    * Initializes filterable checkbox and sets a watch in the filterable scope to track changes
    * in "advancedSettings.browsing.filterableFields".
    */
    mds.directive('initFilterable', function () {
        return {
            restrict: 'A',
            link: function (scope) {
                scope.$watch('advancedSettings.browsing.filterableFields', function() {
                    scope.checked = (scope.advancedSettings.browsing.filterableFields.indexOf(scope.field.basic.name) >= 0);
                });
            }
        };
    });

    /**
    * Displays entity instances data using jqGrid
    */
    mds.directive('entityInstancesGrid', function($compile, $http, $templateCache) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var elem = angular.element(element);

                $.ajax({
                    type: "GET",
                    url: "../mds/entities/" + scope.selectedEntity.id + "/fields",
                    dataType: "json",
                    success: function(result)
                    {
                        var colModel = [], i;

                        for (i=0; i<result.length; i+=1) {
                            colModel.push({
                                name: result[i].basic.displayName,
                                index: result[i].basic.displayName,
                                jsonmap: "fields." + i + ".value"
                            });
                        }

                        elem.jqGrid({
                            url: "../mds/entities/" + scope.selectedEntity.id + "/instances",
                            datatype: 'json',
                            jsonReader:{
                                repeatitems:false
                            },
                            prmNames: {
                                sort: 'sortColumn',
                                order: 'sortDirection'
                            },
                            onSelectRow: function (id) {
                                scope.selectInstanceHistory(id);
                            },
                            shrinkToFit: true,
                            autowidth: true,
                            rownumbers: true,
                            rowNum: 2,
                            rowList: [2, 5, 10, 20, 50],
                            colModel: colModel,
                            pager: '#' + attrs.entityInstancesGrid,
                            width: '100%',
                            height: 'auto',
                            viewrecords: true,
                            gridComplete: function () {
                                $('#entityInstancesTable').children('div').width('100%');
                                $('.ui-jqgrid-htable').addClass('table-lightblue');
                                $('.ui-jqgrid-btable').addClass("table-lightblue");
                                $('.ui-jqgrid-htable').addClass('table-lightblue');
                                $('.ui-jqgrid-bdiv').width('100%');
                                $('.ui-jqgrid-hdiv').width('100%');
                                $('.ui-jqgrid-hbox').width('100%');
                                $('.ui-jqgrid-view').width('100%');
                                $('#t_resourceTable').width('auto');
                                $('.ui-jqgrid-pager').width('100%');
                                $('#entityInstancesTable').children('div').each(function() {
                                    $('table', this).width('100%');
                                    $(this).find('#resourceTable').width('100%');
                                    $(this).find('table').width('100%');
                               });
                            }
                        });
                    }
                });
            }
        };
    });

    /**
    * Displays instance history data using jqGrid
    */
    mds.directive('instanceHistoryGrid', function($compile, $http, $templateCache) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var elem = angular.element(element);

                $.ajax({
                    type: "GET",
                    url: "../mds/instances/" + scope.selectedInstance + "/fields",
                    dataType: "json",
                    success: function(result)
                    {
                        var colModel = [], i;

                        colModel.push({
                            name: "",
                            width: 15,
                            formatter: function () {
                                return "<a><i class='icon-refresh icon-large'></i></a>";
                            },
                            sortable: false
                        });

                        for (i=0; i<result.length; i+=1) {
                            if (result[i].basic.displayName === "Date") {
                                colModel.push({
                                    name: result[i].basic.displayName,
                                    index: result[i].basic.displayName,
                                    jsonmap: "fields." + i + ".value"
                                });
                            } else {
                                colModel.push({
                                    name: result[i].basic.displayName,
                                    index: result[i].basic.displayName,
                                    jsonmap: "fields." + i + ".value",
                                    sortable: false
                                });
                            }
                        }

                        elem.jqGrid({
                            url: "../mds/entities/" + scope.selectedInstance + "/history",
                            datatype: 'json',
                            jsonReader:{
                                repeatitems:false
                            },
                            prmNames: {
                                sort: 'sortColumn',
                                order: 'sortDirection'
                            },
                            shrinkToFit: true,
                            autowidth: true,
                            rownumbers: true,
                            rowNum: 2,
                            rowList: [2, 5, 10, 20, 50],
                            colModel: colModel,
                            pager: '#' + attrs.instanceHistoryGrid,
                            width: '100%',
                            height: 'auto',
                            viewrecords: true,
                            gridComplete: function () {
                                $('#instanceHistoryTable').children('div').width('100%');
                                $('.ui-jqgrid-htable').addClass('table-lightblue');
                                $('.ui-jqgrid-btable').addClass("table-lightblue");
                                $('.ui-jqgrid-htable').addClass('table-lightblue');
                                $('.ui-jqgrid-bdiv').width('100%');
                                $('.ui-jqgrid-hdiv').width('100%');
                                $('.ui-jqgrid-hbox').width('100%');
                                $('.ui-jqgrid-view').width('100%');
                                $('#t_historyTable').width('auto');
                                $('.ui-jqgrid-pager').width('100%');
                            }
                        });
                    }
                });
            }
        };
    });

    mds.directive('draggable', function() {
        return function(scope, element) {
            var el = element[0];

            el.draggable = true;
            el.addEventListener(
                'dragstart',
                function(e) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('Text', this.attributes.fieldId.value);
                    this.classList.add('drag');
                    return false;
                },
                false
            );

            el.addEventListener(
                'dragend',
                function(e) {
                    this.classList.remove('drag');
                    return false;
                },
                false
            );
        };
    });

    mds.directive('droppable', function() {
        return {
            scope: {
              drop: '&',
              container: '='
            },
            link: function(scope, element) {

                var el = element[0];
                el.addEventListener(
                    'dragover',
                    function(e) {
                        e.dataTransfer.dropEffect = 'move';
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        this.classList.add('over');
                        return false;
                    },
                    false
                );

                el.addEventListener(
                    'dragenter',
                    function(e) {
                        this.classList.add('over');
                        return false;
                    },
                    false
                );

                el.addEventListener(
                    'dragleave',
                    function(e) {
                        this.classList.remove('over');
                        return false;
                    },
                    false
                );

                el.addEventListener(
                    'drop',
                    function(e) {
                        if (e.stopPropagation) {
                            e.stopPropagation();
                        }
                        var fieldId = e.dataTransfer.getData('Text'),
                            containerId = this.id;

                        scope.$apply(function(scope) {
                            var fn = scope.drop();
                            if ('undefined' !== typeof fn) {
                                fn(fieldId, containerId);
                            }
                        });

                        return false;
                    },
                    false
                );
            }
        };
    });
}());