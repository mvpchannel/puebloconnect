// Google Map
if ($("#map-canvas").length) {

    jQuery(document).ready(function($) {

        "use strict";

        var map;

        function initialize() {

            var mapOptions = {
                zoom: 14,
                center: new google.maps.LatLng(34.1119, -118.1926)
            };

            map = new google.maps.Map(
                document.getElementById("map-canvas"),
                mapOptions
            );

            // Marker 1
            var marker = new google.maps.Marker({
                map: map,
                icon: "images/map-marker.png",
                title: "Highland Park",
                position: new google.maps.LatLng(34.1119, -118.1926)
            });

            // Marker 2
            var marker2 = new google.maps.Marker({
                map: map,
                icon: "images/map-marker2.png",
                title: "Local Business",
                position: new google.maps.LatLng(34.1165, -118.1848)
            });

            // Marker 3
            var marker3 = new google.maps.Marker({
                map: map,
                icon: "images/map-marker3.png",
                title: "Pueblo Connect",
                position: new google.maps.LatLng(34.1058, -118.1990)
            });

            // Info Windows
            var infowindow = new google.maps.InfoWindow({
                content: "<b>Highland Park</b><br>Pueblo Connect Community"
            });

            var infowindow2 = new google.maps.InfoWindow({
                content: "<b>Local Business</b><br>Pueblo Connect"
            });

            var infowindow3 = new google.maps.InfoWindow({
                content: "<b>Pueblo Connect</b><br>Connect Local. Shop Local. Grow Together."
            });

            // Open first marker
            infowindow.open(map, marker);

            // Marker clicks
            google.maps.event.addListener(marker, "click", function() {
                infowindow.open(map, marker);
            });

            google.maps.event.addListener(marker2, "click", function() {
                infowindow2.open(map, marker2);
            });

            google.maps.event.addListener(marker3, "click", function() {
                infowindow3.open(map, marker3);
            });

        } // end initialize

        google.maps.event.addDomListener(
            window,
            "load",
            initialize
        );

    }); // end document.ready

} // end map-canvas check