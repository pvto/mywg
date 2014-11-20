'use strict';
//require lodash.js
//require three.js

/**
    MYWG "My WebGL Graphs"
    This is a simple 3D plotting library demo by github.com/users/pvto
    - contents:
      + Builder methods for simple infographs 
      + Infograph components (axises, titles)
      + Helper methods for mapping from model to 3D/2D/1D space
*/
window.MYWG = (function() {

    var coalesce = function( a, b, c, d, e, f, g, h, i, j ) {
        if (a !== undefined) { return a; }
        if (b !== undefined) { return b; }
        if (c !== undefined) { return c; }
        if (d !== undefined) { return d; }
        if (e !== undefined) { return e; }
        if (f !== undefined) { return f; }
        if (g !== undefined) { return g; }
        if (h !== undefined) { return h; }
        if (i !== undefined) { return i; }
        return j;
    };

    var isWrapped = function( obj ) {
        return _.isObject( obj ) && _.isObject( obj.MYWG_data );
    };

    var wrappedValue = function( obj ) {
        if ( _.isObject( obj ) ) {
            return obj.MYWG_data;
        }
        return undefined;
    };

    var wrap = function( obj, withValue ) {
        obj.MYWG_data = withValue;
    };
    wrap.test = wrap.isWrapped = isWrapped;
    wrap.get = wrap.wrappedValue = wrappedValue;


    var rdecim = function( decim, precision ) {
        return Math.round( ( decim ) * precision ) / precision;
    };


    var range = function( data, mapper ) {
        
        var scale = function( min, max ) {
            var magn = Math.abs( max - min );
            var dd = 1e-6;
            while( magn > dd ) {
                dd *= 10;
            }
            dd /= 10;
            return dd;
        };
        var start = function( scale, min ) {
            return min - ( min % Math.abs( scale ) );
        };
        var end = function( scale, max, start ) {
            var loop = start;
            while ( loop < max ) { loop += scale / 10; }
            return loop;
        };
        var min = _.min( _.map( data, mapper ) ),
            max = _.max( _.map( data, mapper ) ),
            scl = scale( min, max ),
            strt = start( scl, min ),
            ticks = {
                scale: scl,
                start: strt,
                end: end( scl, max, strt )
            }
            ;
        var range_ = {
            min: min,
            max: max,
            magnitude: max - min,
            ticks: ticks,
            normx: function( thatx, margin ) {
                margin = margin || 0;
                return ( thatx - min ) / ( max - min ) * (1 - margin * 2) - 0.5 + margin;
            },
            tickList: function( level ) {
                if (level === undefined) { level = 1; }
                level = Math.pow( 10, level );
                var ret = [];
                var x = ticks.start;
                var n = ( ticks.end - ticks.start ) / ticks.scale * level + 1e-6;
                for( var i = 0; i <= n; i ++ ) {
                    ret.push( { ind : i, 
                                x : x, 
                                level: ( ( x % scl <= 1e-6 || i == n ) ? 0 : 1 ) } );
                    x += ticks.scale / level;
                }
                return ret;
            }
        };
        return range_;
    };


    var CoordinateUtil = {

        createLine : function( xrange, yrange, x, coord, margin, material ) {

            var geometry = new THREE.Geometry();
            var xx = ( coord=='x' ? xrange : yrange).normx( x, margin );
            var drange = ( coord=='x' ? yrange : xrange );
            var y = drange.normx( drange.ticks.start, margin );
            var pos = ( coord=='x' ? new THREE.Vector3( xx, y ) : new THREE.Vector3( y, xx ) );
            geometry.vertices.push( pos );
            var y = drange.normx( drange.ticks.end, margin );
            var pos = ( coord=='x' ? new THREE.Vector3( xx, y ) : new THREE.Vector3( y, xx ) );
            geometry.vertices.push( pos );
            var line = new THREE.Line( geometry, material );
            return line;
        },

        createXyCoordinateLines : function( xRange, yRange, margin, levelx, levely, material ) {

            if (levelx === undefined) { levelx = 1; }
            if (levely === undefined) { levely = 10; }

            var xticks = xRange.tickList( levelx );
            var yticks = yRange.tickList( levely );
            var ret = [];
            var i = 0;
            var makeText = function( tick, xalign ) {
                var textMaterial = new THREE.MeshLambertMaterial( { color: 0x404040 } );
                var rounded = rdecim( tick.x, 100 );
                return makeHeader1( "" + rounded, { xalign: xalign, size: 0.01 }, textMaterial );
            }
            _.forEach( xticks, function( tick ) {
                var line = CoordinateUtil.createLine( xRange, yRange, tick.x, 'x', margin, 
                        material );
                ret.push( line );
                if (tick.level == 0 || i == xticks.length - 1) {
                    var text = makeText( tick, 0 );
                    text.position.x += xRange.normx( tick.x, margin );
                    text.position.y += yRange.normx( yRange.ticks.start, margin ) - 0.01;
                    ret.push( text );
                }
                i++;
            });
            i = 0;
            _.forEach( yticks, function( tick ) {
                var line = CoordinateUtil.createLine( xRange, yRange, tick.x, 'y', margin, 
                        material );
                ret.push( line );
                if (tick.level == 0 || i == yticks.length - 1) {
                    var text = makeText( tick, -1 );
                    text.position.y += yRange.normx( tick.x, margin );
                    text.position.x += xRange.normx( xRange.ticks.start, margin ) - 0.01;
                    ret.push( text );
                }
                i++;
            });
            return ret;
        }

    };


    var makeHistogram = function( x, y, params ) {

        var data = params.data;
        var margin = params.margin || 0;
        var material = params.material || new LineBasicMaterial( { color: 0x000000, linewidth: 2 } );

        var group = new THREE.Object3D();

        var xrange = MYWG.range( data, x );
        var yrange = MYWG.range( data, y );

        for( var i = 1; i < data.length; i ++ ) {
            var d0 = data[ i - 1 ],
                d1 = data[ i ]
                ;
            var geometry = new THREE.Geometry();

            geometry.vertices.push( new THREE.Vector3( 
                xrange.normx( x(d0), margin ),
                yrange.normx( y(d0), margin ),
                0.01)
            );
            geometry.vertices.push( new THREE.Vector3( 
                xrange.normx( x(d1), margin ),
                yrange.normx( y(d1), margin ),
                0.01)
            );
            var line = new THREE.Line( geometry, material );
            group.add( line );
        }

        var bgGroup = new THREE.Object3D();
        group.add( bgGroup );

        var coordMaterial = new THREE.LineBasicMaterial( { color: 0xb0b0b0 } );
        _.forEach( MYWG.CoordinateUtil.createXyCoordinateLines(xrange, yrange, margin, 0, 0, coordMaterial), function(line) {
                bgGroup.add(line);
            }
        );

        return group;
    };


    var makeHeader1 = function( text, params, textMaterial ) {
        params.xalign = params.xalign || 0;
        params.size = params.size || 0.07;
        params.height = params.height || ( params.size / 8 );
        params.curveSegments = params.curveSegments || 12;
        params.font = params.font || "helvetiker";
        params.weight = params.weight || "bold";
        params.style = params.style || "normal";
        params.bevelThickness = params.bevelThickness || 0.01;
        params.bevelSize = params.bevelSize || 0.005;
        params.bevelEnabled = params.bevelEnabled || false;
        params.castShadow = params.castShadow || false;
        params.receiveShadow = params.receiveShadow || false;
        var textGeo = new THREE.TextGeometry( text, params );

        textGeo.computeBoundingBox();
        var centerOffset = ( ( params.xalign - 1 ) / 2 ) * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );
        var yCenter = ( textGeo.boundingBox.max.y - textGeo.boundingBox.min.y );

        var mesh = new THREE.Mesh( textGeo, textMaterial );
        mesh.position.set( centerOffset, -yCenter / 2, 0 );

        mesh.castShadow = params.castShadow;
        mesh.receiveShadow = params.receiveShadow;

        return mesh;
    };


    var makePieChart = function( mapper, data, pieParams ) {

        pieParams = pieParams || {};
        var extent = pieParams.r || 1;
        var startAngle = pieParams.startAngle || 0;
        var extrudeSettings = pieParams.extrudeSettings || {};

        var group = new THREE.Object3D();


        var sum = function( data ) {
            return _.reduce( data, function( sum, d ) { return sum + mapper( d ); }, 0 );
        }
        var findAlfa = function( d ) {
            return ( mapper( d ) / sum( d.data ) ) * Math.PI * 2;
        }
        var findXy = function( fun, model ) {
             return fun( model.startAngle + model.alfa / 2 );
        }
        var createSlice = function( d, i ) {

            var model = {
                d: d,
                i: i,
                data: data,
                startAngle: startAngle,
                alfa: findAlfa( d ),
                r: extent,
                update: function() {
                    model.x = findXy( Math.cos, model ) * model.d.lift ;
                    model.y = findXy( Math.sin, model ) * model.d.lift ;
                }
            };
            model.update();

            var update = function() {
                model.update();
                model.group.position.set( model.x, model.y - 0.05, 0);
            };

            var create = function() {

                var pieGroup = new THREE.Object3D();
                model.group = pieGroup;

                var pieShape = new THREE.Shape();
                pieShape.moveTo( 0, 0 );

                pieShape.absellipse( 0, 0, model.r, model.r, model.startAngle, model.startAngle + model.alfa, true );
                pieShape.moveTo( 0, 0 );
                var geometry = new THREE.ExtrudeGeometry( pieShape, extrudeSettings );
                var mesh = THREE.SceneUtils.createMultiMaterialObject( geometry, [ new THREE.MeshLambertMaterial( { color: d.color } ), //new THREE.MeshBasicMaterial( { color: 0xa0a0a0, wireframe: true, transparent: true } ) 
                        ] );

                mesh.position.set( 0, 0, 0 );
                mesh.rotation.set( 0.1, 0.1, 0 );
                mesh.scale.set( 1, 1, 1 );
                pieGroup.add( mesh );

                //create title
                var xalign = 0;
                var acos = Math.cos( model.startAngle + model.alfa / 3);
                if (Math.abs( acos ) > 0.01) {
                    xalign = 1 * Math.sign( acos );
                }
                var textMaterial = new THREE.MeshPhongMaterial( { 
                    color: 0xffffff, 
                    specular: 0x000000, 
                    ambient: 0xffffff 
                } );

                var title = makeHeader1( d.label, { xalign: xalign, size: 0.0175, bevelEnabled: true }, textMaterial );
                title.position.x += 1.2 * model.r * findXy( Math.cos, model );
                title.position.y += 1.2 * model.r * findXy( Math.sin, model );
                pieGroup.add( title );

                update( model );

                MYWG.wrap( pieGroup, {
                    model: model,
                    update: update,
                    create: create
                } );
                return pieGroup;
            }
            return create( model );
        }

        for( var i = 0; i < data.length; i ++ ) {

            var d = data[ i ];
            var slice = createSlice( d, i );
            group.add( slice );

            startAngle += MYWG.wrap.get( slice ).model.alfa;
        }
        return group;
    };

    function animate( elem ) {

        if ( isWrapped( elem ) ) {

            var animops = wrappedValue( elem );
            var tr = animops.transform;
            if ( tr !== undefined ) {

                if ( tr.startTime === undefined ) {

                    tr.startTime = clock.getElapsedTime();

                    var pos = new THREE.Vector3(),
                        rot = new THREE.Vector3()
                        ;
                    pos.copy( elem.position );
                    rot.copy( elem.rotation );
                    
                    tr.MYWG_orig = { 
                        position: pos, 
                        rotation: rot
                    };
                }

                var delay = tr.delay || 0,
                    elapsed = clock.getElapsedTime() - tr.startTime - delay
                    ;
                if ( ! tr.stopped && elapsed >= 0 ) {

                    var t = Math.min( 1, elapsed / tr.dur );
                    tr.stopped = ( t >= 1 );

                    if ( tr.x != undefined ) {
                        elem.position.x = tr.slope( t, tr.MYWG_orig.position.x, tr.x );
                    }                    
                    if ( tr.y != undefined ) {
                        elem.position.y = tr.slope( t, tr.MYWG_orig.position.y, tr.y );
                    }
                    if ( tr.z != undefined ) {
                        elem.position.z = tr.slope( t, tr.MYWG_orig.position.z, tr.z );
                    }
                    if ( tr.rotx != undefined ) {
                        elem.rotation.x = tr.slope( t, tr.MYWG_orig.rotation.x, tr.rotx );
                    }                    
                    if ( tr.roty != undefined ) {
                        elem.rotation.y = tr.slope( t, tr.MYWG_orig.rotation.y, tr.roty );
                    }
                    if ( tr.rotz != undefined ) {
                        elem.rotation.z = tr.slope( t, tr.MYWG_orig.rotation.z, tr.rotz );
                    }
                    //similarly, other elements

                }
            }
        }
    };

    return {
        coalesce: coalesce,
        wrap: wrap,
        range: range,
        CoordinateUtil: CoordinateUtil,
        makeHeader: makeHeader1,
        makeHistogram: makeHistogram,
        makePieChart: makePieChart,
        animate: animate,
        slopes: {
            lin: function( t, start, end ) { 
                return start + t * ( end - start );
            },
            sin: function( t, start, end ) { 
                return start + Math.sin( t * Math.PI / 2 ) * ( end - start );
            },
            cube: function( t, start, end ) { 
                return start + t * t * t * ( end - start );
            }
        }
    };

})();