/* 
 Created on : 14/12/2014, 03:58:48
 Author     : Edgar Eler <eler@edgar.systems>
 */

var controleMap, viewer, scene, camera, terrainProvider, tmpMarcador,
    flightPath, canvas, handler, startMousePosition, mousePosition,
    point, pontoReferencial, primitives, globe, uav, colorSelected,
    btnUAV, btnUnit, btnCircle, btnPolyline, btnPolygon, type,
    btnRed, btnGreen, btnBlue, btnYellow, btnBlack, btnWhite,
    ellipsoid, splash, btStart, tela01, tela02, tela03, tela04;


var center = {lat: 37.8368958, lng: -121.7605489, hgt: 750.0};
var radius = 3000;
var circleLength = 2 * Math.PI * radius;
var speed = 27.8;
var fatorCircleAngle = (speed * (2 * Math.PI)) / circleLength;

//var speed = 300;
var actualAngle = 0;
var angleRotacao = 0;
var raioRotacao = 0;
var tmpLng = center.lng;
var tmpLat = 0;
var sumX = false;
var fps = 60;
//var angleSpeed = 0.00025;
var angleSpeed = fatorCircleAngle / fps;
var started = false;
var zoomLevel = 1;
var zoomMaximo = 70;
var fatorZoom = 100;

var uavAngle = 90;

var anglesChanging = {up: 0, right: 0};

var flags = {
    looking: false
};

var TYPE_UNIT = 1001;
var TYPE_CIRCLE = 1002;
var TYPE_POLYLINE = 1003;
var TYPE_POLYGON = 1004;

var uavHUDClicked = unitClicked = circleClicked = polylineClicked = polygonClicked = false;

var overlays = Array();

var markers = Array();

//anchor: x 35, y 24

Cesium.BingMapsApi.defaultKey = 'Am6qQh97YFYz4cTHPbzsE241FOpr3wiwOoV0O3h4_WUkmQ3LJaZoR2ZGcZUK6Ig4';

window.onload = function() {
    initialize();
    var viewer = new Cesium.Viewer('uav_map_canvas', {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false
    });

    btnUAV = document.getElementById("btnUAV");
    btnUnit = document.getElementById("btnUnit");
    btnCircle = document.getElementById("btnCircle");
    btnPolyline = document.getElementById("btnPolyline");
    btnPolygon = document.getElementById("btnPolygon");
    btnRed = document.getElementById("btnRed");
    btnGreen = document.getElementById("btnGreen");
    btnBlue = document.getElementById("btnBlue");
    btnYellow = document.getElementById("btnYellow");
    btnBlack = document.getElementById("btnBlack");
    btnWhite = document.getElementById("btnWhite");
    splash = document.getElementById("splash");
    btStart = document.getElementById("btStart");
    tela01 = document.getElementById("tela01");
    tela02 = document.getElementById("tela02");
    tela03 = document.getElementById("tela03");
    tela04 = document.getElementById("tela04");

    btStart.onclick = function(){
        splash.style.display = "none";
        tela01.style.display = "block";
    };
    
    tela01.onclick = function(){
        tela01.style.display = "none";
        tela02.style.display = "block";
    };
    
    tela02.onclick = function(){
        tela02.style.display = "none";
        tela03.style.display = "block";
    };
    
    tela03.onclick = function(){
        tela03.style.display = "none";
        tela04.style.display = "block";
    };
    
    tela04.onclick = function(){
        tela04.style.display = "none";
    };

    btnUnit.onclick = function() {
        if (!type || type === TYPE_UNIT) {
            removeClickedColors();

            if (unitClicked === true) {
                unitClicked = false;
                this.setAttribute("class", "");
                type = null;
                colorSelected = null;
                openColors(false);
            } else {
                unitClicked = true;
                type = TYPE_UNIT;
                this.setAttribute("class", "clicked");
                openColors(true);
            }
        }
    };

    btnCircle.onclick = function() {
        if (!type || type === TYPE_CIRCLE) {
            removeClickedColors();

            if (circleClicked === true) {
                circleClicked = false;
                this.setAttribute("class", "");
                type = null;
                colorSelected = null;
                openColors(false);
            } else {
                circleClicked = true;
                type = TYPE_CIRCLE;
                this.setAttribute("class", "clicked");
                openColors(true);
            }
        }
    };

    btnPolyline.onclick = function() {
        if (!type || type === TYPE_POLYLINE) {
            removeClickedColors();

            if (polylineClicked === true) {
                polylineClicked = false;
                this.setAttribute("class", "");
                type = null;
                colorSelected = null;

                if (overlays.length > 0) {
                    overlays[overlays.length - 1].closed = true;
                }

                openColors(false);
            } else {
                polylineClicked = true;
                type = TYPE_POLYLINE;
                this.setAttribute("class", "clicked");
                openColors(true);
            }
        }
    };

    btnPolygon.onclick = function() {
        if (!type || type === TYPE_POLYGON) {
            removeClickedColors();

            if (polygonClicked === true) {
                polygonClicked = false;
                this.setAttribute("class", "");
                type = null;
                colorSelected = null;

                if (overlays.length > 0) {
                    overlays[overlays.length - 1].closed = true;
                }

                openColors(false);
            } else {
                polygonClicked = true;
                type = TYPE_POLYGON;
                this.setAttribute("class", "clicked");
                openColors(true);
            }
        }
    };

    btnRed.onclick = btnGreen.onclick = btnBlue.onclick = btnYellow.onclick = btnBlack.onclick = btnWhite.onclick = function() {
        colorSelected = this.getAttribute("data-bind");
        removeClickedColors();
        this.setAttribute("class", this.getAttribute("class") + " clicked");

        if (overlays.length > 0 && (overlays[overlays.length - 1].type === TYPE_POLYLINE || overlays[overlays.length - 1].type === TYPE_POLYGON) && overlays[overlays.length - 1].closed === false) {
            overlays[overlays.length - 1].closed = true;
        }
    };

    scene = viewer.scene;
    camera = scene.camera;
    primitives = scene.primitives;
    globe = viewer.scene.globe;
    ellipsoid = scene.globe.ellipsoid;

    canvas = scene.canvas;
    canvas.setAttribute('tabindex', '0'); // needed to put focus on the canvas
    canvas.onclick = function() {
        canvas.focus();
    };

    scene.screenSpaceCameraController.enableRotate = false;
    scene.screenSpaceCameraController.enableTranslate = false;
    scene.screenSpaceCameraController.enableZoom = false;
    scene.screenSpaceCameraController.enableTilt = false;
    scene.screenSpaceCameraController.enableLook = false;

    handler = new Cesium.ScreenSpaceEventHandler(canvas);

    handler.setInputAction(function(movement) {
        flags.looking = true;
        mousePosition = startMousePosition = Cesium.Cartesian3.clone(movement.position);
        /*
        var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
        
        if (cartesian) {
            var cartographic = ellipsoid.cartesianToCartographic(cartesian);
            
            var event = {latLng: new google.maps.LatLng(Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude))};
            
            addOverlay(event);
        }*/
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction(function(movement) {
        mousePosition = movement.endPosition;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(function(position) {
        flags.looking = false;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    handler.setInputAction(function(movement) {
        var cartesian = scene.camera.pickEllipsoid(movement.position, ellipsoid);
        
        if (cartesian) {
            var cartographic = ellipsoid.cartesianToCartographic(cartesian);
            
            var event = {latLng: new google.maps.LatLng(Cesium.Math.toDegrees(cartographic.latitude), Cesium.Math.toDegrees(cartographic.longitude))};
            
            addOverlay(event);
            /*
            label.show = true;
            label.text = '(' + Cesium.Math.toDegrees(cartographic.longitude).toFixed(2) + ', ' + Cesium.Math.toDegrees(cartographic.latitude).toFixed(2) + ')';
            label.position = cartesian;
            */
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(function(delta) {
        //var newHeight = 0;
        if (delta > 0) {
            zoomIn();
            //newHeight = 0.5 * camera.positionCartographic.height;
        } else {
            zoomOut();
            //newHeight = 2 * camera.positionCartographic.height;
        }
        //zoom(newHeight, mousePosition.x, mousePosition.y);
    }, Cesium.ScreenSpaceEventType.WHEEL);


    terrainProvider = new Cesium.CesiumTerrainProvider({
        url: '//cesiumjs.org/stk-terrain/tilesets/world/tiles'
    });
    scene.terrainProvider = terrainProvider;

    pontoReferencial = center;

    camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, center.hgt)
    });

    //camera.lookUp(Math.PI / 3);

    uav = {
        path: 'M48.208,76.496l-18.8-0.452v-2.381l18.519-4.206c0,0-0.617-10.899-0.617-12.277  c0-0.112-0.596,2.47-0.596,2.47L0,55.946v-4.14l47.237-3.122c0-14.559-1.815-15.876-1.815-21.408c0-2.835,2.687-7.845,4.578-7.845  c1.892,0,4.578,5.01,4.578,7.845c0,5.532-1.815,6.85-1.815,21.408L100,51.807v4.14l-46.714,3.703c0,0-0.596-2.582-0.596-2.47  c0,1.378-0.617,12.277-0.617,12.277l18.52,4.206v2.381l-18.8,0.452l-0.318-2.021c0,0-0.157,2.593-0.554,4.472  c1.365-0.087,3.068-0.194,3.25-0.207c0.45-0.032,0.85,0.21,0.893,0.541c0.044,0.33-0.305,0.744-1.107,0.61  c-1.795-0.302-3.126-0.521-4.092-0.665c-0.663-0.1-0.871-0.71-0.899-0.871c-0.313-1.787-0.44-3.88-0.44-3.88L48.208,76.496z   M49.848,79.894c-0.974-0.114-2.26-0.321-3.958-0.651c-0.799-0.154-1.151,0.28-1.108,0.61c0.043,0.331,0.443,0.573,0.893,0.541  c0.2-0.014,2.228-0.143,3.634-0.231c0.19,0.603,0.418,1.005,0.691,1.005c0.207,0,0.388-0.23,0.546-0.603  C50.581,80.454,50.805,80.005,49.848,79.894z',
        strokeColor: 'black',
        fillColor: 'white',
        strokeWeight: 1,
        fillOpacity: 1,
//        scale: 0.5,
        scale: controleMap.getZoom() / 26,
        anchor: new google.maps.Point(50, 52),
        rotation: uavAngle
    };

    tmpMarcador = new google.maps.Marker({
        position: new google.maps.LatLng(center.lat, center.lng),
        map: controleMap,
        icon: uav,
        title: "Avião",
        clickable: false
    });

    var circleOptions = {
        strokeColor: '#00FF00',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        fillColor: '#00FF00',
        fillOpacity: 0.0,
        map: controleMap,
        center: new google.maps.LatLng(center.lat, center.lng),
        radius: radius,
        clickable: false
    };
    // Add the circle for this city to the map.
    flightPath = new google.maps.Circle(circleOptions);

    //37.8415271,-121.7816677

    /*
     addCircle(
     {lat: 37.8415271, lng: -121.7816677},
     1500,
     {red: 255, green: 0, blue: 0}
     );
     */
    anglesChanging.up = Math.tan(radius / center.hgt);
    raioRotacao = getRaioReferencial(anglesChanging.up);

    google.maps.event.addListener(controleMap, 'click', addOverlay);

    setInterval(function() {
        /*
         if (tmpLng >= center.lng + radiusInCoordinates) {
         sumX = false;
         } else if (tmpLng <= center.lng - radiusInCoordinates) {
         sumX = true;
         }
         
         if (sumX === false) {
         tmpLng -= speedByFrameInCoordinates;
         tmpLat = circleY(tmpLng, center, radiusInCoordinates, false);
         } else {
         tmpLng += speedByFrameInCoordinates;
         tmpLat = circleY(tmpLng, center, radiusInCoordinates, true);
         }
         */

        point = FindPointAtDistanceFrom(center, actualAngle, radius / 1000);

        /*if (started === false) {
         camera.lookAt(
         Cesium.Cartesian3.fromDegrees(point.lng, point.lat, center.hgt),
         Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 0),
         Cesium.Cartesian3.UNIT_Z
         );
         }*/

        tmpMarcador.setPosition(new google.maps.LatLng(point.lat, point.lng));

        /*
         scene.camera.flyTo({
         destination: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, center.hgt)
         });
         */

        if (started === false) {
            anglesChanging.right = Math.PI + actualAngle;
        }

        if (flags.looking) {
            started = true;

            //globe._surface._debug.wireframe = true;

            var width = canvas.clientWidth;
            var height = canvas.clientHeight;

            // Coordinate (0.0, 0.0) will be where the mouse was clicked.
            var x = (mousePosition.x - startMousePosition.x) / width;
            var y = -(mousePosition.y - startMousePosition.y) / height;

            var lookFactor = 0.05;

            //if (Math.abs(x) > Math.abs(y)) {
            //camera.lookRight(x * lookFactor);
            //camera.rotateRight(x * lookFactor);
            //} else {
            //camera.lookUp(y * lookFactor);
            //}

            var movementUp = anglesChanging.up + (y * lookFactor);

            if (movementUp > 0 && movementUp < Math.PI / 2) {
                //if (movementUp > 0 && movementUp < (60 * (Math.PI / 180))) {
                //if (movementUp > 0 && movementUp < getHorizon()) {
                //camera.lookUp(y * lookFactor);

                //anglesChanging.up += (y * lookFactor);
                anglesChanging.up = movementUp;

                raioRotacao = getRaioReferencial(anglesChanging.up);
            }

            anglesChanging.right += (x * lookFactor);


            //camera.rotate(Cesium.Cartesian3.UNIT_Z,y * lookFactor);
            //camera.rotate(Cesium.Cartesian3.fromDegrees(point.lng, point.lat, center.hgt), y * lookFactor);

            //console.log("Right: " + anglesChanging.right);
        }

        pontoReferencial = FindPointAtDistanceFrom(point, anglesChanging.right, raioRotacao / 1000);

        var eyePoint = getEye(anglesChanging.right, (Math.PI / 2) - anglesChanging.up, raioRotacao / 1000);

        camera.lookAt(
            //Cesium.Cartesian3.fromDegrees(point.lng, point.lat, center.hgt),
            Cesium.Cartesian3.fromDegrees(eyePoint.lng, eyePoint.lat, eyePoint.hgt),
            Cesium.Cartesian3.fromDegrees(pontoReferencial.lng, pontoReferencial.lat, 0),
            //Cesium.Cartesian3.UNIT_Z
            Cesium.Cartesian3.fromDegrees(pontoReferencial.lng, pontoReferencial.lat, center.hgt)
            );

        //camera.zoomIn(1000);

        //camera.setPositionCartographic(new Cesium.Cartographic(DegreesToRadians(point.lng), DegreesToRadians(point.lat), center.hgt));

        //camera.position = Cesium.Cartesian3.fromDegrees(point.lng, point.lat, center.hgt);

        //console.log("(x,y): (" + point.lat + "," + point.lng + ")");

        actualAngle += angleSpeed;

        uav.rotation += RadiansToDegrees(angleSpeed);
        uav.scale = controleMap.getZoom() / 26,
            tmpMarcador.setIcon(uav);

        if (actualAngle > 360) {
            actualAngle = 0;
        }
    }, 1000 / fps);
};
function initialize() {
    var pontoInicio = new google.maps.LatLng(center.lat, center.lng);
    var controleMapOptions = {
        center: pontoInicio,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        rotateControl: false,
        mapTypeControl: false,
        backgroundColor: "#000000",
        disableDefaultUI: true
    };
    controleMap = new google.maps.Map(document.getElementById("controle_map_canvas"), controleMapOptions);
}

function circleY(x, centro, raio, plus) {
//(x - h)² + (y - k)² = r²
//(y - k)² = r² - (x - h)²
//(y - k) = √[r² - (x - h)²]
//y = k + √[r² - (x - h)²]
    var y;
    var fator = Math.sqrt(Math.pow(raio, 2) - Math.pow((x - centro.lng), 2));
    if (plus === true) {
        y = centro.lat + fator;
    } else {
        y = centro.lat - fator;
    }

    return y;
}

function translateCoordinates(distance, origpoint, angle) {
    var distanceNorth = Math.sin(angle) * distance;
    var distanceEast = Math.cos(angle) * distance;
    var earthRadius = 6378137;
    var newLat = origpoint.lat + (distanceNorth / earthRadius) * 180 / Math.PI;
    var newLon = origpoint.lng + (distanceEast / (earthRadius * Math.cos(newLat * 180 / Math.PI))) * 180 / Math.PI;
    return {lat: newLat, lng: newLon};
}

function FindPointAtDistanceFrom(startPoint, initialBearingRadians, distanceKilometres) {
    var radiusEarthKilometres = 6378.137;
    var distRatio = distanceKilometres / radiusEarthKilometres;
    var distRatioSine = Math.sin(distRatio);
    var distRatioCosine = Math.cos(distRatio);
    var startLatRad = DegreesToRadians(startPoint.lat);
    var startLonRad = DegreesToRadians(startPoint.lng);
    var startLatCos = Math.cos(startLatRad);
    var startLatSin = Math.sin(startLatRad);
    var endLatRads = Math.asin((startLatSin * distRatioCosine) + (startLatCos * distRatioSine * Math.cos(initialBearingRadians)));
    var endLonRads = startLonRad
        + Math.atan2(
            Math.sin(initialBearingRadians) * distRatioSine * startLatCos,
            distRatioCosine - startLatSin * Math.sin(endLatRads));
    return {lat: RadiansToDegrees(endLatRads), lng: RadiansToDegrees(endLonRads)};
}

function DegreesToRadians(degrees) {
    var degToRadFactor = Math.PI / 180;
    return degrees * degToRadFactor;
}

function RadiansToDegrees(radians) {
    var radToDegFactor = 180 / Math.PI;
    return radians * radToDegFactor;
}

function getHorizon() {
    var distance = 3.57 * Math.sqrt(center.hgt);

    var angleHorizon = getAngle(distance, center.hgt);

    return angleHorizon;
}

function getRaioReferencial(angulo) {
    return (Math.tan(angulo) * center.hgt);
}

function zoomIn() {
    zoomLevel++;

    if (zoomLevel > zoomMaximo) {
        zoomLevel = zoomMaximo;
    }
}

function zoomOut() {
    zoomLevel--;

    if (zoomLevel < 1) {
        zoomLevel = 1;
    }
}

function getEye(anguloRight, anguloUp, distancia) {
    var tmpDistancia = distancia;

    var fatorDistancia = tmpDistancia / fatorZoom;

    var distanciaZoom = fatorDistancia * zoomLevel;

    //if(distanciaZoom > 20){
    //    distanciaZoom = 20;
    //}

    var fatorAltura = center.hgt / fatorZoom;

    //var alturaZoom = fatorAltura * zoomLevel;
    var alturaZoom = fatorAltura * zoomLevel;

    /*
     if(alturaZoom > (distancia / 50)){
     alturaZoom = (distancia / 50);
     }
     */

    var eyePoint = FindPointAtDistanceFrom(point, anguloRight, distanciaZoom);

    //var alturaZoom = Math.tan(anguloUp) * distanciaZoom;

    return {lat: eyePoint.lat, lng: eyePoint.lng, hgt: center.hgt - alturaZoom};
}

function getAngle(x, y) {
    return Math.tan(x / y);
}

var speedInCoordinates = translateCoordinates(speed, {lat: 0, lng: 0}, 0).lng;
var speedByFrameInCoordinates = speedInCoordinates / fps;
var radiusInCoordinates = translateCoordinates(radius, {lat: 0, lng: 0}, 0).lng;

function addCircle(circlecenter, circleRadius, color) {
    var circleOptions = {
        strokeColor: 'rgb(' + color.red + ',' + color.green + ',' + color.blue + ')',
        strokeOpacity: 1.0,
        strokeWeight: 5,
        fillColor: 'rgb(' + color.red + ',' + color.green + ',' + color.blue + ')',
        fillOpacity: 0.5,
        map: controleMap,
        center: new google.maps.LatLng(circlecenter.lat, circlecenter.lng),
        radius: circleRadius
    };
    // Add the circle for this city to the map.
    var circle = new google.maps.Circle(circleOptions);

    /*
     // cylinder
     var length = center.hgt;
     var topRadius = circleRadius;
     var bottomRadius = circleRadius;
     var modelMatrix = Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(
     Cesium.Cartesian3.fromDegrees(circlecenter.lng, circlecenter.lat)), new Cesium.Cartesian3(0.0, 0.0, center.hgt), new Cesium.Matrix4());
     var cylinderInstance = new Cesium.GeometryInstance({
     geometry: new Cesium.CylinderGeometry({
     length: length,
     topRadius: topRadius,
     bottomRadius: bottomRadius,
     vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
     }),
     modelMatrix: modelMatrix,
     attributes: {
     //color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromRandom({alpha: 1.0}))
     color: new Cesium.ColorGeometryInstanceAttribute(color.red / 255, color.green / 255, color.blue / 255, 0.5)
     }
     });
     
     primitives.add(new Cesium.Primitive({
     geometryInstances: [cylinderInstance],
     appearance: new Cesium.PerInstanceColorAppearance({
     translucent: true,
     closed: true
     })
     }));
     */

}

function addOverlay(event) {
    if (type && colorSelected) {
        switch (type) {
            case TYPE_UNIT:
                /*
                 var unitOptions = {
                 fillColor: colorSelected,
                 fillOpacity: 1.0,
                 map: controleMap,
                 center: new google.maps.LatLng(event.latLng.lat(), event.latLng.lng()),
                 radius: 5
                 };
                 // Add the circle for this city to the map.
                 var unit = new google.maps.Circle(unitOptions);
                 */

                var symbol = {
                    path: 'M0,0 L9,0 L9,9 L0,9 L0,0z',
//        strokeColor: colorSelected,
                    fillColor: colorSelected,
//        strokeWeight: 1,
                    fillOpacity: 1,
//        scale: 0.5,
                    scale: controleMap.getZoom() / 13,
                    anchor: new google.maps.Point(5, 5)
                };

                var marker = new google.maps.Marker({
                    position: event.latLng,
                    map: controleMap,
                    icon: symbol,
                    clickable: false
                });

                var ovl = {overlay: marker, type: TYPE_UNIT, closed: true};

                overlays.push(ovl);

                break;
            case TYPE_CIRCLE:
                var raio = prompt("Informe o Raio da Área Circular em Metros", "500");

                if (raio && raio != null) {
                    var circleOptions = {
                        strokeColor: colorSelected,
                        strokeOpacity: 1.0,
                        strokeWeight: 3,
                        fillColor: colorSelected,
                        fillOpacity: 0.5,
                        map: controleMap,
                        center: event.latLng,
                        radius: parseInt(raio)
                    };
                    // Add the circle for this city to the map.
                    var circle = new google.maps.Circle(circleOptions);

                    var ovl = {overlay: circle, type: TYPE_CIRCLE, closed: true};

                    overlays.push(ovl);
                }
                break;
            case TYPE_POLYGON:
                if (overlays.length > 0 && overlays[overlays.length - 1].type === TYPE_POLYGON && overlays[overlays.length - 1].closed === false) {
                    overlays[overlays.length - 1].overlay.getPath().push(event.latLng);
                } else {
                    var polygOptions = {
                        paths: [event.latLng],
                        strokeColor: colorSelected,
                        strokeOpacity: 1.0,
                        strokeWeight: 3,
                        fillColor: colorSelected,
                        fillOpacity: 0.5,
                        clickable: false
                    };

                    var polyg = new google.maps.Polygon(polygOptions);
                    polyg.setMap(controleMap);
                    polyg.getPath().push(event.latLng);

                    var ovl = {overlay: polyg, type: TYPE_POLYGON, closed: false};

                    overlays.push(ovl);
                }

                addMarcadorRect(event.latLng);
                break;

            case TYPE_POLYLINE:
                if (overlays.length > 0 && overlays[overlays.length - 1].type === TYPE_POLYLINE && overlays[overlays.length - 1].closed === false) {
                    overlays[overlays.length - 1].overlay.getPath().push(event.latLng);
                } else {
                    var polyOptions = {
                        strokeColor: colorSelected,
                        strokeOpacity: 1.0,
                        strokeWeight: 3,
                        clickable: false
                    };

                    var poly = new google.maps.Polyline(polyOptions);
                    poly.setMap(controleMap);
                    poly.getPath().push(event.latLng);

                    var ovl = {overlay: poly, type: TYPE_POLYLINE, closed: false};

                    overlays.push(ovl);
                }

                addMarcadorRect(event.latLng);

                break;
        }
    }
}

function openColors(open) {
    if (open === true) {
        document.getElementById("colors").style.display = "block";
    } else {
        document.getElementById("colors").style.display = "none";
    }
}

function addMarcadorRect(location) {
    var symbol = {
        path: 'M0,0 L9,0 L9,9 L0,9 L0,0z',
//        strokeColor: colorSelected,
        fillColor: colorSelected,
//        strokeWeight: 1,
        fillOpacity: 1,
//        scale: 0.5,
        scale: controleMap.getZoom() / 13,
        anchor: new google.maps.Point(5, 5)
    };

    var marker = new google.maps.Marker({
        position: location,
        map: controleMap,
        icon: symbol,
        clickable: false
    });

    markers.push(marker);
}

function removeClickedColors() {
    btnRed.setAttribute("class", "bg-red");
    btnGreen.setAttribute("class", "bg-green");
    btnBlue.setAttribute("class", "bg-blue");
    btnYellow.setAttribute("class", "bg-yellow");
    btnBlack.setAttribute("class", "bg-black");
    btnWhite.setAttribute("class", "bg-white");
}