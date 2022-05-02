// Todo list
////////////////
// Design site:
// Filter all toggle on / off
// Add total, filtered, etc.
// Disclaimer, guidance, etc.

// JS stuff pending:
// don't remove fullText markers/infowindows
// add history
// bbox vs viewport?
// maps fetch, show clustersize in count + update fulltext.
// iframe for live / timelapse

let map, infoWindow, property;
let markers = [];
let bubbles = [];
let live = document.getElementById("live");
let hd = document.getElementById("hd");
let total = document.getElementById("total");
let filtered = document.getElementById("filtered");
let shown = document.getElementById("shown");

function refreshCams(pos, zoom) {
  let property;
  if (live == true && hd == true) {
    property = "property=live,hd/";
  } else if (live == true && hd == false) {
    property = "property=live/";
  } else if (live == false && hd == true) {
    property = "property=hd/";
  } else {
    property = "";
  }

  let myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("x-windy-key", "O1gjC9qelwQKifrT2vlmlmPK7A5F3MhJ");

  let requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  /*   fetch(
  `https://api.windy.com/api/webcams/v2/map/${pos.Ab.j},${pos.Va.j},${pos.Ab.h},${pos.Va.h},${zoom}/limit=20/property=live&?show=webcams:location, map, player, url`, requestOptions
  ) */

  fetch(
    `https://api.windy.com/api/webcams/v2/list/bbox=${pos.Ab.j},${pos.Va.j},${pos.Ab.h},${pos.Va.h}/${property}limit=25&?show=webcams:basic, category, image, location, map, player, property, statistics, url, user;properties`,
    requestOptions
  )
    // add image, status, statistics, property?
    .then((response) => response.json())
    .then((result) => {
      console.log(result);

      // update stats

      // clears markers from map and window text
      function clearMarkers() {
        for (let i = 0; i < markers.length; i++) {
          markers[i].setMap(null);
        }

        markers = [];
        bubbles = [];
        infoText = [];
      }

      clearMarkers();

      // for each camera returned
      result.result.webcams.forEach((cam, index) => {
        // generate an info window

        /*       if (cam.player.live.available == false) */
        const infowindow = new google.maps.InfoWindow({
          fullText: `
          <div id="camtext">
            <h3>${cam.title}</h3>
            <a id="thumb" href="#"><img src=${cam.image.current.thumbnail} alt="thumbnail" /></a>
            Watch <b><a href=https://webcams.windy.com/webcams/stream/${cam.id}>LIVE</b> | <b><a href=${cam.player.day.embed}>Timelapse</a></b>
            <ul>
            <li><b>Location:</b> <a href=${cam.location.wikipedia}>${cam.location.city}. ${cam.location.region}</a></li>
            <li><b>Coordinates:</b> ${cam.location.latitude}. ${cam.location.longitude}</li>
            <li><b>Views:</b> ${cam.statistics.views}</li>
            <li><b>Status:</b> ${cam.status}</li>
            </ul>
            <br>

            </div>
            `,
          smallText: cam.title,
          content: cam.title,
          naxWidth: 400,

          //disableAutoPan: true
        });
        infoText.push(infowindow);

        // drop markers for cams on map
        window.setTimeout(() => {
          const marker = new google.maps.Marker({
            map,
            animation: google.maps.Animation.DROP,
            position: { lat: cam.location.latitude, lng: cam.location.longitude },
          });
          markers.push(marker);

          const image =
            "https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png";

          const bubble = new google.maps.Marker({
            map,
            animation: google.maps.Animation.DROP,
            position: { lat: cam.location.latitude, lng: cam.location.longitude },
            icon: image
          });
          bubbles.push(bubble);

          // on mouseover, open little text
          marker.addListener("mouseover", () => {
            infowindow.open({
              anchor: marker,
              map,
              shouldFocus: false,
            });
          });

          // on mouseout, close little text
          marker.addListener("mouseout", () => {
            if (infowindow.content == infowindow.smallText) {
              infowindow.close({
                anchor: marker,
                map,
                shouldFocus: false,
              });
            }
          });

          // on click, open bigtext
          marker.addListener("click", () => {
            infowindow.setContent(infowindow.fullText);
          });

          // on click, open zoom in one level
          bubble.addListener("click", () => {
            //zoom in one level
          });

          // on closeclick, close bigtext
          infowindow.addListener("closeclick", () => {
            infowindow.close({
              anchor: marker,
              map,
              shouldFocus: false,
            });
            infowindow.setContent(infowindow.smallText);
          });
        }, 50 * index);
      });
    })
    .catch((error) => console.log("error", error));
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 43.67225961466724, lng: -79.60014046738281 },
    zoom: 6,
    streetViewControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    minZoom: 3,
  });

  pos = map.getBounds();
  //refreshCams(pos, map.zoom)

  infoWindow = new google.maps.InfoWindow();

  map.addListener("dragend", () => {
    pos = map.getBounds();
    refreshCams(pos, map.zoom);
  });

  map.addListener("zoom_changed", () => {
    pos = map.getBounds();
    refreshCams(pos, map.zoom);
    console.log(pos);
  });

  const locationButton = document.createElement("button");

  locationButton.textContent = "Pan to Current Location";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          infoWindow.setPosition(pos);
          infoWindow.setContent("Location found.");
          infoWindow.open(map);
          map.setCenter(pos);
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

$(window).on("load", function () {
  $(".show-player").magnificPopup({
    type: "iframe",
    midClick: true,
    mainClass: "custom-popup-class",
  });
});

(function ($) {
  var CheckboxDropdown = function (el) {
    var _this = this;
    this.isOpen = false;
    this.areAllChecked = false;
    this.$el = $(el);
    this.$label = this.$el.find(".dropdown-label");
    this.$checkAll = this.$el.find('[data-toggle="check-all"]').first();
    this.$inputs = this.$el.find('[type="checkbox"]');

    this.onCheckBox();

    this.$label.on("click", function (e) {
      e.preventDefault();
      _this.toggleOpen();
    });

    this.$checkAll.on("click", function (e) {
      e.preventDefault();
      _this.onCheckAll();
    });

    this.$inputs.on("change", function (e) {
      _this.onCheckBox();
    });
  };

  CheckboxDropdown.prototype.onCheckBox = function () {
    this.updateStatus();
  };

  CheckboxDropdown.prototype.updateStatus = function () {
    var checked = this.$el.find(":checked");

    this.areAllChecked = false;
    this.$checkAll.html("Check All");

    if (checked.length <= 0) {
      this.$label.html("Select Categories");
    } else if (checked.length === 1) {
      this.$label.html(checked.parent("label").text());
    } else if (checked.length === this.$inputs.length) {
      this.$label.html("All Selected");
      this.areAllChecked = true;
      this.$checkAll.html("Uncheck All");
    } else {
      this.$label.html(checked.length + " Selected");
    }
  };

  CheckboxDropdown.prototype.onCheckAll = function (checkAll) {
    if (!this.areAllChecked || checkAll) {
      this.areAllChecked = true;
      this.$checkAll.html("Uncheck All");
      this.$inputs.prop("checked", true);
    } else {
      this.areAllChecked = false;
      this.$checkAll.html("Check All");
      this.$inputs.prop("checked", false);
    }

    this.updateStatus();
  };

  CheckboxDropdown.prototype.toggleOpen = function (forceOpen) {
    var _this = this;

    if (!this.isOpen || forceOpen) {
      this.isOpen = true;
      this.$el.addClass("on");
      $(document).on("click", function (e) {
        if (!$(e.target).closest("[data-control]").length) {
          _this.toggleOpen();
        }
      });
    } else {
      this.isOpen = false;
      this.$el.removeClass("on");
      $(document).off("click");
    }
  };

  var checkboxesDropdowns = document.querySelectorAll('[data-control="checkbox-dropdown"]');
  for (var i = 0, length = checkboxesDropdowns.length; i < length; i++) {
    new CheckboxDropdown(checkboxesDropdowns[i]);
  }
})(jQuery);

// $('<iframe class=".mfp-iframe">').appendTo('head');
// $('iframe').contents().find('head').html('<base target="_parent">');
