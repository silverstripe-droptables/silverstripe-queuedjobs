QueuedJobListField = Class.create();
QueuedJobListField.prototype = {
	errorMessage: "Error talking to server",

	initialize: function() {
		var rules = {};

		rules['#'+this.id+' table.data a.deletelink'] = {
			onclick: this.deleteRecord.bind(this)
		};

		rules['#'+this.id+' table.data a.pauselink'] = {
			onclick: this.pause.bind(this)
		};

		rules['#'+this.id+' table.data a.resumelink'] = {
			onclick: this.resume.bind(this)
		};
		
		rules['#'+this.id+' table.data a.executelink'] = {
			onclick: this.execute.bind(this)
		};

		rules['#'+this.id+' th a'] = {
			onclick: this.refresh.bind(this)
		};

		rules['#'+this.id+' th'] = {
			initialize: function() {
				var sortLinks = $$('span.sortLinkHidden a', this);
				if(sortLinks) sortLinks[0].style.visibility = 'hidden';
			},
			onmouseover: function(e) {
				var sortLinks = $$('span.sortLinkHidden a', this);
				if(sortLinks) sortLinks[0].style.visibility = 'visible';
			},
			onmouseout: function(e) {
				var sortLinks = $$('span.sortLinkHidden a', this);
				if(sortLinks) sortLinks[0].style.visibility = 'hidden';
			}
		};

		rules['#'+this.id+' div.PageControls a'] = {onclick: this.refresh.bind(this)};

		rules['#'+this.id+' table.data tr td.markingcheckbox'] = {
			onclick : function(e) {
			    // do nothing for clicks in marking box cells (e.g. if checkbox is missed)
			}
		};

		// initialize summary (if needed)
		// TODO Breaks with nested divs
		var summaryCols = $$('tfoot tr.summary td', this);
		this._summaryDefs = [];

		//should check summaryCols.length, because summaryCols will always be an array, though its length could be 0.
		if(summaryCols && summaryCols.length) {
			rules['#'+this.id+' table.data tbody input'] = {
				onchange: function(e) {
					if (!e) e = window.event; // stupid IE
					// workaround for wrong scope with bind(this) and applyTo()
					var root = Event.findElement(e,'div');
					// TODO Fix slow $$()-calls and re-enable clientside summaries
					//root._summarise();
				}
			};
			rules['#'+this.id+' table.data  tbody select'] = {
				onchange: function(e) {
					if (!e) e = window.event; // stupid IE
					// workaround for wrong scope with bind(this) and applyTo()
					var root = Event.findElement(e,'div');
					// TODO Fix slow $$()-calls and re-enable clientside summaries
					//root._summarise();
				}.bind(this)
			};
		}

		Behaviour.register('TableListField_'+this.id,rules);

		/*
		if(summaryCols.length) {
			this._getSummaryDefs(summaryCols);
		}
		*/
	},

	pause: function (e) {
		var link = Event.findElement(e,"a");
		Event.stop(e);
		ajaxLink(link.href);
		var el = $(this.id);
		var newLink = link.href.substr(0, link.href.indexOf('/item/'));
		el.setAttribute('href', newLink);
		this.refresh();
		return false;
	},

	resume: function (e) {
		var link = Event.findElement(e,"a");
		Event.stop(e);
		ajaxLink(link.href);
		var el = $(this.id);
		var newLink = link.href.substr(0, link.href.indexOf('/item/'));
		el.setAttribute('href', newLink);
		this.refresh();
		return false;
	},
	
	execute: function (e) {
		var link = Event.findElement(e,"a");
		Event.stop(e);
		ajaxLink(link.href);
		var el = $(this.id);
		var newLink = link.href.substr(0, link.href.indexOf('/item/'));
		el.setAttribute('href', newLink);
		this.refresh();
		return false;
	},

	/**
	 * Deletes the given dataobject record via an ajax request
	 * to complextablefield->Delete()
	 * @param {Object} e
	 */
	deleteRecord: function(e) {
		var img = Event.element(e);
		var link = Event.findElement(e,"a");
		var row = Event.findElement(e,"tr");

		// TODO ajaxErrorHandler and loading-image are dependent on cms, but formfield is in sapphire
		var confirmed = confirm(ss.i18n._t('TABLEFIELD.DELETECONFIRMMESSAGE', 'Are you sure you want to delete this record?'));
		if(confirmed)
		{
			img.setAttribute("src",'cms/images/network-save.gif'); // TODO doesn't work
			new Ajax.Request(
				link.getAttribute("href"),
				{
					method: 'post',
					postBody: 'forceajax=1' + ($('SecurityID') ? '&SecurityID=' + $('SecurityID').value : ''),
					onComplete: function(){
						Effect.Fade(
							row,
							{
								afterFinish: function(obj) {
									// remove row from DOM
									obj.element.parentNode.removeChild(obj.element);
									// recalculate summary if needed (assumes that TableListField.js is present)
									// TODO Proper inheritance
									if(this._summarise) this._summarise();
									// custom callback
									if(this.callback_deleteRecord) this.callback_deleteRecord(e);
								}.bind(this)
							}
						);
					}.bind(this),
					onFailure: this.ajaxErrorHandler
				}
			);
		}
		Event.stop(e);
	},

	removeById: function(id) {
		var el =$('record-' + this.id + '-' + id);
		if(el) el.parentNode.removeChild(el);
		this._summarise();
	},

	refresh: function(e) {
		if(e) {
			var el = Event.element(e);
			if(el.nodeName != "a") el = Event.findElement(e,"a");
		} else {
			var el = $(this.id);
		}

		if(el.getAttribute('href')) {
    		new Ajax.Request(
    			el.getAttribute('href'),
    			{
    				postBody: 'update=1',
    				onComplete: function(response) {
    					Element.replace(this.id, response.responseText);
						// reapply behaviour and reattach methods to TF container node
						// e.g. <div class="TableListField">
    					Behaviour.apply($(this.id), true);
    				}.bind(this)
    			}
    		);
		}

		if(e) Event.stop(e);
		return false;
	},

	ajaxErrorHandler: function(response) {
		if(typeof(window.ajaxErrorHandler) == 'function') {
			window.ajaxErrorHandler();
		} else {
			alert(this.errorMessage);
		}
	},

	_getSummaryDefs: function(summaryCols) {
		summaryCols.each(function(col, pos) {
			if( col ) {
				var func = this._getSummaryFunction(col.className);
				this._summaryDefs[pos] = {col: col, pos: pos, func: func};
			}
		}.bind(this));

		this._summarise();
	},

	_summarise: function() {
		var rows = $$('tbody tr', this);
		if(!rows) return false;

		var columnData = [];
		// prepare the array (gets js-errors otherwise)
		var cols = $$('td', rows[0]);
		for(colPos=0; colPos<cols.length; colPos++) {
			columnData[colPos] = [];
		}

		for(rowPos=0; rowPos<rows.length; rowPos++) {
			// avoid wrong calculations for nested lists
			if(Element.hasClassName(rows[rowPos], "subitem")) continue;

			var cols = $$('td', rows[rowPos]);
			var colPos = 0;
			for(colPos; colPos<cols.length; colPos++) {
				//if(!columnData[colPos]) columnData[colPos] = [];
				if(this._summaryDefs[colPos] && this._summaryDefs[colPos].func) {
					columnData[colPos][rowPos] = this._getValue(cols[colPos]);
				} else {
					columnData[colPos][rowPos] = "";
				}
			}
		}

		for(colPos=0; colPos<columnData.length; colPos++) {
			if(this._summaryDefs[colPos] && this._summaryDefs[colPos].func) {
				var summaryVal = this._summaryDefs[colPos].func.apply(this,[columnData[colPos]]);
				this._summaryDefs[colPos].col.innerHTML = summaryVal;
			}
		}
	},

	_getSummaryFunction: function(func) {
		if(this[func] && typeof this[func] == "function") {
			// local
			return this[func];
		} else if(window[func] && typeof window[func] == "function") {
			// global
			return window[func];
		} else {
			// not existing
			return false
		}
	},

	_getValue: function(col) {
		var inputNode = $$('input', col);
		if(inputNode[0]) {
			return $F(inputNode[0]);
		}
		var selectNode = $$('select', col);
		if(selectNode[0]) {
			return $F(selectNode[0]);
		}
		return col.innerHTML.stripTags();
	},

	/**
	 * ############# Summary Functions ##############
	 */

	sum: function(arr) {
		var sum = 0;
		arr.each(function(val) {
			sum += val*1; // convert to float
		});
		return sum;
	},

	sumCurrency: function(arr) {
		var sum = 0;
		arr.each(function(val) {
			if(!val) return;
			val = val.replace(/\$/,'');
			val = val.replace(/\,/,'');
			sum+= val*1; // convert to float
		});
		return sum.toCurrency();
	},

	max: function(arr) {
		return arr.max();
	},

	min: function(arr) {
		return arr.min();
	}
}


QueuedJobListField.applyTo('div.QueuedJobListField');
//
//
//Behaviour.register({
//	'.QueuedJobListField a.pauselink' : {
//		onclick : function(event) {
//			ajaxLink(this.href);
//			this.refresh.bind(this)
//			Event.stop(event);
//			return false;
//		}
//	},
//
//	'.QueuedJobListField a.resume' : {
//		onclick : function(event) {
//			ajaxLink(this.href);
//			this.refresh.bind(this)
//			Event.stop(event);
//			return false;
//		}
//	}
//});