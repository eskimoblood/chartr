/*
	Chartr 
	v0.1

	Chartr is a javascript class for creating in-browser charts bases on the MooTools javascript library.
		
	Credits
	-------
	Initial version by Ryan Mitchell (ryan@rtnetworks.net)
	Inspired by Plootr http://utils.softr.net/plootr/
	
	Copyright
	---------
 	Copyright 2009 Ryan Mitchell (ryan@rtnetworks.net)
	
*/

Chartr = new Class({
					 
	// we need options and events
	Implements: [Options,Events],
	
	// default options
	options: {
		cssclass: 'chartr-',
		type: 'Line',
		padding: {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5
		}
	},
	
	/*
	* Sets up the class
	* 
	* @param {Element} el			Reference to the canvas element to use
	* @param {Object} options		Options to over-ride the defaults
	* @return {Chartr) this		Chartr reference
	*/
	initialize: function(el,options){
		this.setOptions(options);
		if($defined(Chartr.Types[this.options.type])){
			this.el = $(el);
			if(this.el.get('tag') != 'canvas'){
				throw 'Chartr(): Element is not a canvas element';	
			} else {
				this.container = new Element('div').setStyles({position:'relative',width:this.el.getSize().x,height:this.el.getSize().y});
				this.container.wraps(this.el);
				if(this.prepareCanvas()){
					this.el.store('Chartr',this);
					this.chart = new Chartr.Types[this.options.type](this.el,this,options);
				}
			}
		} else {
			throw 'Chartr(): Chartr.Types.'+this.options.type+' is not defined!';	
		}
	},

	/*
	* Sets up the class
	* 
	* @return {Element) this.el		Reference to the element with the chart init
	*/
	toElement: function(){
		return this.el;
	},

	/*
	* set up the canvas element for a chart to be drawn
	* 
	* @return {Boolean)				Are we set up?
	*/
	prepareCanvas: function(){
		
		// give IE some canvas action
		if(Browser.Engine.trident){
			if($defined(G_vmlCanvasManager)){
				this.maxTries = 20;
				this.renderStack = new Hash();
				this.el = G_vmlCanvasManager.initElement(this.el);	
			} else {
				throw 'Chartr.prepareCanvas(): exCanvas is not defined';	
				return false;
			}
		}
		
		// set up drawing area
		this.area = {
 	        x: this.options.padding.left,
 	        y: this.options.padding.top,
 	        w: this.el.width - this.options.padding.left - this.options.padding.right,
 	        h: this.el.height - this.options.padding.top - this.options.padding.bottom
 	    };
		
		this.fireEvent('canvasPrepared',this);
		
		return true;
	},
	
	call: function(method,args){
		try{
			this.chart[method].run(args,this.chart);
		} catch(e){
			throw 'Chartr.call('+method+'): ' + e;		
		}
	}
	
});

Chartr.Types = {};

Chartr.Types.Line = new Class({
									
	Implements: [Options,Events],
	
	options: {
		minX: 0, // lowest x value
		maxX: 100, // highest x value
		deltaX: 10, // show x value every ..
		minY: 0, // lowest y value
		maxY: 100, // highest y value
		deltaY: 10, // show y value every ..
		axisColor: '#000000', // color of the axes
		axisWidth: 1, // width of axis
		axisMarkerSize: 5,
		showXAxisMarkerValues: true,
		showYAxisMarkerValues: true,
		xLabel: '', // html contents of label for x axis
		yLabel: '', // html content of label for y axis
		joinPoints: true
	},
	
	initialize: function(el,parent,options){
		this.el = el;
		this.parent = parent;
		this.setOptions(options);
		this.drawAxes();
		this.plotted = [];
		this.mousex = this.mousey = 0;
		this.el.addEvent('mousemove', this.mouseHandler.bind(this));
		this.el.addEvent('mouseout', function() {
			this.redraw();
		}.bind(this));
	},
	
	/*
	*	draw the x and y axes
	*/
	drawAxes: function(){
		
		this.fireEvent('beforeAxesDrawn',this.parent);
		
	    var cx = this.el.getContext('2d');
	    cx.strokeStyle = this.options.axisColor;
	    cx.lineWidth = this.options.axisWidth;
				
		// work out how much space we have
		this.area = {
			x:parseInt(this.el.getStyle('padding-left')) + 10,
			y:parseInt(this.el.getStyle('padding-top')) + 10,
			w:this.parent.area.w - parseInt(this.el.getStyle('padding-left')) - parseInt(this.el.getStyle('padding-right')) - 20,
			h:this.parent.area.h - parseInt(this.el.getStyle('padding-top')) - parseInt(this.el.getStyle('padding-bottom')) - 20
		};
		
		// tooltip
		this.tip = new Element('div').addClass(this.parent.options.cssclass+'tooltip').setStyle('display','none');
		this.el.getParent().adopt(this.tip);
		
		// show x label?
		if(this.options.xLabel != ''){
			var d = new Element('div',{html:this.options.xLabel}).addClass(this.parent.options.cssclass+'label-x').setStyle('display','none');
			this.parent.container.adopt(d);
			d.setStyles({
				position:'absolute',
				right:this.area.x + 'px',
				top:this.area.h - d.getSize().y + 'px',
				display:'block'
			});
			this.area.h = this.area.h - d.getSize().y - 10;
		}
		
		// show y label?
		if(this.options.yLabel != ''){
			var d = new Element('div',{html:this.options.yLabel}).addClass(this.parent.options.cssclass+'label-y').setStyle('display','none');
			this.parent.container.adopt(d);
			d.setStyles({
				position:'absolute',
				left: this.area.x + 'px',
				top: this.area.y + 'px',
				display:'block'
			});
			this.area.h = this.area.h - d.getSize().y - 15;
			this.area.y = this.area.y + d.getSize().y + 15;
		}
		
		if(this.options.showXAxisMarkerValues || this.options.showYAxisMarkerValues){
			this.area.x += 20;
			this.area.w -= 20;
		}
		
		// work out how much to space out ticks by
		this.xspacing = this.area.w / ((this.options.maxX - this.options.minX) / this.options.deltaX);
		this.yspacing = this.area.h / ((this.options.maxY - this.options.minY) / this.options.deltaY);
		
		// work out the spacing between each point
		this.xpointspacing = this.area.w / (this.options.maxX - this.options.minX);
		this.ypointspacing = this.area.h / (this.options.maxY - this.options.minY);
		
		// work out where our origin is
		this.origin = [0,0];
		if((this.options.minX < 0) && (this.options.maxX > 0)) this.origin[0] = (0 - this.options.minX) * this.xpointspacing;
		if((this.options.minY < 0) && (this.options.maxY > 0)) this.origin[1] = (0 - this.options.minY) * this.ypointspacing;
		
		// draw x axis
		var xcount = 0;
		for(i=this.options.minX;i<=this.options.maxX;i=i+this.options.deltaX){
			var x = this.area.x + (xcount * this.xspacing);
			var y = this.area.y + this.area.h - this.origin[1];
			cx.beginPath();
			cx.moveTo(x+0.5,y+0.5+(this.options.axisMarkerSize/2));
			cx.lineTo(x+0.5,y+0.5-(this.options.axisMarkerSize/2));
			cx.closePath();
			cx.stroke();
			if(this.options.showXAxisMarkerValues){
				var label = new Element('span',{html:i}).addClass(this.parent.options.cssclass+'axis-x');
				this.parent.container.adopt(label);
				label.setStyles({
					top: y + parseInt(this.el.getStyle('padding-top')) + this.options.axisMarkerSize + 'px',
					left: x + parseInt(this.el.getStyle('padding-left')) - (label.getSize().x/3) + 'px'
				});
			}
			xcount++;
		}
		
		cx.beginPath();
		cx.moveTo(this.area.x+0.5, this.area.y + this.area.h + 0.5 - this.origin[1]);
		cx.lineTo(this.area.x + this.area.w + 0.5, this.area.y + this.area.h + 0.5 - this.origin[1]);
		cx.closePath();
		cx.stroke();
				
		// draw y axis
		var ycount = 0;
		for(i=this.options.maxY;i>=this.options.minY;i=i-this.options.deltaY){
			var y = this.area.y + (ycount * this.yspacing);
			var x = this.area.x + this.origin[0];
			cx.beginPath();
			cx.moveTo(x+0.5+(this.options.axisMarkerSize/2),y+0.5);
			cx.lineTo(x+0.5-(this.options.axisMarkerSize/2),y+0.5);
			cx.closePath();
			cx.stroke();
			if(this.options.showYAxisMarkerValues){
				var label = new Element('span',{html:i}).addClass(this.parent.options.cssclass+'axis-y');
				this.parent.container.adopt(label);
				label.setStyles({
					top: y + parseInt(this.el.getStyle('padding-top')) - (label.getSize().y / 3) + 'px',
					left: x + parseInt(this.el.getStyle('padding-left')) - this.options.axisMarkerSize - label.getSize().x + 'px'
				});
			}
			ycount++;
		}
				
		cx.beginPath();
		cx.moveTo(this.area.x+this.origin[0]+0.5, this.area.y + 0.5);
		cx.lineTo(this.area.x+this.origin[0]+0.5, this.area.y + this.area.h + 0.5);
		cx.closePath();
		cx.stroke();
						
		this.fireEvent('axesDrawn',this.parent);
	
	},
	
	/*
	*	unplot
	*	remove data from this.plotted
	*
	* @param {Ref} data			The points in array format ... eg [[1,2],[3,4]]
	* @param {Object} scheme		Colour scheme object { pointColor: .., pointType:.., pointSize:.., lineColor: .., lineWidth:.. }
	*/
	unplot: function(data,scheme,ref){
		this.plotted.each(function(r){ 
			if(r.ref == ref){
				this.plotted.erase(r);	
			}					   
		},this);
		this.redraw();
	},

	
	/*
	*	plot the data
	*	this one gets called externally as it adds the data to this.plotted
	*
	* @param {Array} data			The points in array format ... eg [[1,2],[3,4]]
	* @param {Object} scheme		Colour scheme object { pointColor: .., pointType:.., pointSize:.., lineColor: .., lineWidth:.. }
	* @param {String} ref			User defined reference for this set of data
	*/
	plot: function(data,scheme,ref){
		if(!scheme) scheme = {};
		var scheme = $extend({ 
			pointColor: '#ff0000',
			pointType: 'square', // circle or square
			pointSize: 4, // radius of circle/ width + length of square
			lineColor: '#cccccc',
			lineSize: 1					 
		},scheme);
		this.plotted.push({
			data: data,
			scheme: scheme,
			ref: ref
		});
		this.plotData(data,scheme);
	},
	
	/*
	*	plot the data
	*
	* @param {Array} data			The points in array format ... eg [[1,2],[3,4]]
	* @param {Object} scheme		Colour scheme object { pointColor: .., pointType:.., pointSize:.., lineColor: .., lineWidth:.. }
	*/
	plotData: function(data,scheme){
	
		this.fireEvent('beforeDataPlotted',this.parent);
				
	    var cx = this.el.getContext('2d');
		cx.fillStyle = scheme.pointColor;
		cx.strokeStyle = scheme.lineColor;
		cx.lineWidth = scheme.lineSize;
				
		var lastPoint = [];
		data.points.each(function(c){
			if(($type(c)=='array') && (c.length > 1)){
								
				// are we drawing a line between points?
				if(this.options.joinPoints){
					if(lastPoint.length>1){
						cx.beginPath();
						cx.moveTo(this.area.x + this.origin[0] + (lastPoint[0] * this.xpointspacing) + (scheme.pointSize/2),this.area.y - this.origin[1] + this.area.h  - (lastPoint[1] * this.ypointspacing));
						cx.lineTo(this.area.x + this.origin[0] + (c[0] * this.xpointspacing) - (scheme.pointSize/2),this.area.y - this.origin[1] + this.area.h - (c[1] * this.ypointspacing));
						cx.stroke();
					}
					lastPoint = c;			
				}
								
				// points on canvas
				var pointx = this.area.x + this.origin[0] + (c[0] * this.xpointspacing) - (scheme.pointSize / 2);
				var pointy = this.area.y - this.origin[1] + this.area.h - (scheme.pointSize / 2) - (c[1] * this.ypointspacing);
				
				// is the mouse over me?
				if((this.mousex >= pointx) && (this.mousex <= pointx + scheme.pointSize)){
					if((this.mousey >= pointy) && (this.mousey <= pointy + scheme.pointSize)){	
						if(c.length > 2) { 
							this.tip.set('html',c[2]).setStyles({
								display:'block',
								left: pointx + 10 + 'px',
								top: pointy - 20 + 'px'
							});
						}
					}
				}
				
				cx.beginPath();
				
				// what do we draw?
				if(scheme.pointType == 'circle'){
					cx.arc(pointx,pointy,scheme.pointSize,0,Math.PI+(Math.PI*3)/2,false);
				} else {
					cx.rect(pointx,pointy,scheme.pointSize,scheme.pointSize);	
				}

				cx.fill();
								
			}
		},this);
			
		this.fireEvent('dataPlotted',this.parent);
	
	},
	
	/*
	*	redraw the canvas
	*
	*	called on mouse movement, so we can simulate mouse over behaviour
	*/
	redraw: function(){
		var cx = this.el.getContext('2d');
		cx.clearRect(0,0,this.el.getSize().x,this.el.getSize().y);
		this.el.getParent().getElements('div').each(function(e){e.dispose();},this);
		this.el.getParent().getElements('span').each(function(e){e.dispose();},this);
		this.drawAxes();
		this.plotted.each(function(d){ this.plotData(d.data,d.scheme); },this);
	},
	
	/*
	*	mousehandler
	*
	*	tracks where the mouse is and calls redraw
	*/
	mouseHandler: function(e){
		var pos = this.el.getCoordinates();
		this.mousex = e.page.x - pos.left;
		this.mousey = e.page.y - pos.top;
		this.redraw();
	}
									
});

Chartr.Types.Bar = new Class({
							 
	Implements: [Options,Events],
	
	options: {
		minY: 0, // lowest y value
		maxY: 100, // highest y value
		deltaY: 10, // show y value every ..
		axisColor: '#000000', // color of the axes
		axisWidth: 1, // width of axis
		axisMarkerSize: 5,
		showXAxisMarkerValues: true,
		showYAxisMarkerValues: true,
		xLabel: '', // html contents of label for x axis
		yLabel: '', // html content of label for y axis
		colors: ['#cc0000','#00cc00','#0000cc']
	},
	
	initialize: function(el,parent,options){
		this.el = el;
		this.parent = parent;
		this.setOptions(options);
		this.mousex = this.mousey = 0;
		this.data = {points:[]};
		this.el.addEvent('mousemove', this.mouseHandler.bind(this));
		this.el.addEvent('mouseout', function() {
			this.redraw();
		}.bind(this));
	},
	
	/*
	*	plot the data
	*/
	plot: function(data){
		this.data = data;
		this.plotData();
		
	},
	
	plotData: function(){
		
		this.fireEvent('beforeAxesDrawn',this.parent);
		
	    var cx = this.el.getContext('2d');
	    cx.strokeStyle = this.options.axisColor;
	    cx.lineWidth = this.options.axisWidth;
				
		// work out how much space we have
		this.area = {
			x:parseInt(this.el.getStyle('padding-left')) + 10,
			y:parseInt(this.el.getStyle('padding-top')) + 10,
			w:this.parent.area.w - parseInt(this.el.getStyle('padding-left')) - parseInt(this.el.getStyle('padding-right')) - 20,
			h:this.parent.area.h - parseInt(this.el.getStyle('padding-top')) - parseInt(this.el.getStyle('padding-bottom')) - 20
		};
		
		// tooltip
		this.tip = new Element('div').addClass(this.parent.options.cssclass+'tooltip').setStyle('display','none');
		this.el.getParent().adopt(this.tip);
		
		// show x label?
		if(this.options.xLabel != ''){
			var d = new Element('div',{html:this.options.xLabel}).addClass(this.parent.options.cssclass+'label-x').setStyle('display','none');
			this.parent.container.adopt(d);
			d.setStyles({
				position:'absolute',
				right:this.area.x + 'px',
				top:this.area.h - d.getSize().y + 'px',
				display:'block'
			});
			this.area.h = this.area.h - d.getSize().y - 10;
		}
		
		// show y label?
		if(this.options.yLabel != ''){
			var d = new Element('div',{html:this.options.yLabel}).addClass(this.parent.options.cssclass+'label-y').setStyle('display','none');
			this.parent.container.adopt(d);
			d.setStyles({
				position:'absolute',
				left: this.area.x + 'px',
				top: this.area.y + 'px',
				display:'block'
			});
			this.area.h = this.area.h - d.getSize().y - 15;
			this.area.y = this.area.y + d.getSize().y + 15;
		}
		
		if(this.options.showXAxisMarkerValues || this.options.showYAxisMarkerValues){
			this.area.x += 20;
			this.area.w -= 20;
		}
		
		// work out how much to space out ticks by
		this.xspacing = this.area.w / this.data.points.length;
		this.yspacing = this.area.h / ((this.options.maxY - this.options.minY) / this.options.deltaY);
		
		// work out the spacing between each point
		this.xpointspacing = this.area.w / this.data.points.length;
		this.ypointspacing = this.area.h / (this.options.maxY - this.options.minY);
		
		// work out where our origin is
		this.origin = [0,0];
		
		// draw x axis
		var xcount = 0;
		this.data.points.each(function(p){
			var x = this.area.x + (xcount * this.xspacing);
			var y = this.area.y + this.area.h - this.origin[1];
			cx.beginPath();
			cx.moveTo(x+0.5,y+0.5+(this.options.axisMarkerSize/2));
			cx.lineTo(x+0.5,y+0.5-(this.options.axisMarkerSize/2));
			cx.closePath();
			cx.stroke();
			if(this.options.showXAxisMarkerValues){
				var label = new Element('span',{html:p[0]}).addClass(this.parent.options.cssclass+'axis-x');
				this.parent.container.adopt(label);
				label.setStyles({
					top: y + parseInt(this.el.getStyle('padding-top')) + this.options.axisMarkerSize + 'px',
					left: x + parseInt(this.el.getStyle('padding-left')) + this.xspacing/2 - (label.getSize().x/3) + 'px'
				});
			}
			xcount++;
		},this);
		
		cx.beginPath();
		cx.moveTo(this.area.x+0.5, this.area.y + this.area.h + 0.5 - this.origin[1]);
		cx.lineTo(this.area.x + this.area.w + 0.5, this.area.y + this.area.h + 0.5 - this.origin[1]);
		cx.closePath();
		cx.stroke();
				
		// draw y axis
		var ycount = 0;
		for(i=this.options.maxY;i>=this.options.minY;i=i-this.options.deltaY){
			var y = this.area.y + (ycount * this.yspacing);
			var x = this.area.x + this.origin[0];
			cx.beginPath();
			cx.moveTo(x+0.5+(this.options.axisMarkerSize/2),y+0.5);
			cx.lineTo(x+0.5-(this.options.axisMarkerSize/2),y+0.5);
			cx.closePath();
			cx.stroke();
			if(this.options.showYAxisMarkerValues){
				var label = new Element('span',{html:i}).addClass(this.parent.options.cssclass+'axis-y');
				this.parent.container.adopt(label);
				label.setStyles({
					top: y + parseInt(this.el.getStyle('padding-top')) - (label.getSize().y / 3) + 'px',
					left: x + parseInt(this.el.getStyle('padding-left')) - this.options.axisMarkerSize - label.getSize().x + 'px'
				});
			}
			ycount++;
		}
				
		cx.beginPath();
		cx.moveTo(this.area.x+this.origin[0]+0.5, this.area.y + 0.5);
		cx.lineTo(this.area.x+this.origin[0]+0.5, this.area.y + this.area.h + 0.5);
		cx.closePath();
		cx.stroke();
		
		this.fireEvent('axesDrawn',this.parent);
			
		this.fireEvent('beforeDataPlotted',this.parent);
				
	    var cx = this.el.getContext('2d');
			
		var xcount = 0;
		this.data.points.each(function(c){
			if(($type(c)=='array') && (c.length > 1)){
				
				// is the mouse over me?
				if((this.mousex >= (this.area.x + (xcount*this.xspacing))) && (this.mousex <= (this.area.x + (xcount+1)*this.xspacing))){
					if((this.mousey >= (this.area.y + this.area.h - (c[1]*this.ypointspacing))) && (this.mousey <= (this.area.y + this.area.h))){	
						if(c.length > 2) { 
							this.tip.set('html',c[2]).setStyles({
								display:'block',
								left: this.mousex + 10 + 'px',
								top: this.mousey - 20 + 'px'
							});
						}
					}
				}
								
				cx.beginPath();
				cx.fillStyle = this.options.colors[xcount%this.options.colors.length];
				cx.rect(this.area.x + (xcount*this.xspacing),this.area.y + this.area.h - (c[1]*this.ypointspacing),this.xspacing,(c[1]*this.ypointspacing));	
				cx.fill();
				
				xcount++;
								
			}
		},this);
			
		this.fireEvent('dataPlotted',this.parent);
	
	},
	
	/*
	*	unplot
	*
	*/
	unplot: function(){
		this.data = {points:[]};
		this.redraw();
	},
	
	/*
	*	mousehandler
	*
	*	tracks where the mouse is and calls redraw
	*/
	mouseHandler: function(e){
		var pos = this.el.getCoordinates();
		this.mousex = e.page.x - pos.left;
		this.mousey = e.page.y - pos.top;
		this.redraw();
	},
	
	/*
	*	redraw the canvas
	*
	*	called on mouse movement, so we can simulate mouse over behaviour
	*/
	redraw: function(){
		var cx = this.el.getContext('2d');
		cx.clearRect(0,0,this.el.getSize().x,this.el.getSize().y);
		this.el.getParent().getElements('div').each(function(e){e.dispose();},this);
		this.el.getParent().getElements('span').each(function(e){e.dispose();},this);
		this.plotData();
	}
							 
});

Chartr.Types.Pie = new Class({
							 
	Implements: [Options,Events],
	
	options: {
		colors: ['#cc0000','#00cc00','#0000cc']
	},
	
	initialize: function(el,parent,options){
		this.el = el;
		this.parent = parent;
		this.setOptions(options);
		this.mousex = this.mousey = 0;
		this.data = {slices:[]};
		this.el.addEvent('mousemove', this.mouseHandler.bind(this));
		this.el.addEvent('mouseout', function() {
			this.redraw();
		}.bind(this));
	},
	
	/*
	*	plot the data
	*/
	plot: function(data){
		// sum up our data
		var sum = 0;
		data.slices.each(function(s){
			sum += s[1];					  
		},this);
		// assign values to slices
		var angle = 0;
		data.slices.each(function(s){
			if(s[1] > 0){
				fraction = s[1]/sum;
				if(s.length == 2) s.push(null);
				s.push(2 * angle * Math.PI);
				s.push(2 * (angle+fraction) * Math.PI)
				angle += fraction;
			}
		},this);
		this.data = data;
		this.plotData();
	},
	
	plotData: function(){
		
		this.fireEvent('beforeAxesDrawn',this.parent);
		
	    var cx = this.el.getContext('2d');
				
		// work out how much space we have
		this.area = {
			x:parseInt(this.el.getStyle('padding-left')) + 10,
			y:parseInt(this.el.getStyle('padding-top')) + 10,
			w:this.parent.area.w - parseInt(this.el.getStyle('padding-left')) - parseInt(this.el.getStyle('padding-right')) - 20,
			h:this.parent.area.h - parseInt(this.el.getStyle('padding-top')) - parseInt(this.el.getStyle('padding-bottom')) - 20
		};
		
		// tooltip
		this.tip = new Element('div').addClass(this.parent.options.cssclass+'tooltip').setStyle('display','none');
		this.el.getParent().adopt(this.tip);
		
		// work out where to put our pie
		this.centerx = this.area.x + (this.area.w * 0.5);
    	this.centery = this.area.y + (this.area.h * 0.5);
		this.radius = Math.min(this.area.w * 0.5, this.area.h * 0.5);
		
		this.fireEvent('axesDrawn',this.parent);
			
		this.fireEvent('beforeDataPlotted',this.parent);
				
	    var cx = this.el.getContext('2d');
		this.data.slices.each(function(s,i){
			
			if(s.length > 4){
						
				if(Math.abs(s[4] - s[3]) > 0.001){
						
					cx.fillStyle = this.options.colors[i%this.options.colors.length];
					cx.beginPath();
					cx.moveTo(this.centerx, this.centery);
					cx.arc(this.centerx, this.centery, this.radius, 
							s[3] - Math.PI/2,
							s[4] - Math.PI/2,
							false);
					cx.lineTo(this.centerx, this.centery);
					cx.closePath();
					cx.fill();

				}
			
			}
			
		},this);
			
		this.fireEvent('dataPlotted',this.parent);
	
	},
	
	/*
	*	unplot
	*
	*/
	unplot: function(){
		this.data = {points:[]};
		this.redraw();
	},
	
	/*
	*	mousehandler
	*
	*	tracks where the mouse is and calls redraw
	*/
	mouseHandler: function(e){
		var pos = this.el.getCoordinates();
		this.mousex = e.page.x - pos.left;
		this.mousey = e.page.y - pos.top;
		this.redraw();
	},
	
	/*
	*	redraw the canvas
	*
	*	called on mouse movement, so we can simulate mouse over behaviour
	*/
	redraw: function(){
		var cx = this.el.getContext('2d');
		cx.clearRect(0,0,this.el.getSize().x,this.el.getSize().y);
		this.el.getParent().getElements('div').each(function(e){e.dispose();},this);
		this.el.getParent().getElements('span').each(function(e){e.dispose();},this);
		this.plotData();
	}
							 
});