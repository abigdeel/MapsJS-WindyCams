// Todo list
////////////////
// Design site:
// Filter all toggle on / off
// Add total, filtered, etc.
// Disclaimer, guidance, etc.

// JS stuff pending:
// don't remove fullText markers/infowindows ????
// add history localStorage, also filters
// bbox vs viewport?
// maps fetch, show clustersize in count + update fulltext.
// fix zoom + 1 and zoom change issue.
// iframe for live / timelapse
// refreshing cams popup...
// show local time on infow!
// close infow if clicking outside of infow

//icon 1 always camera
//icon 2 either cluster or LIVE

let map, infoWindow, apiType, apiZoom;
let markers = [];
let bubbles = [];

let filters = document.getElementById("filters");
let category = document.getElementsByClassName("category");
let live = document.getElementById("live");
let hd = document.getElementById("hd");
let total = document.getElementById("total");
let filtered = document.getElementById("filtered");
let shown = document.getElementById("shown");
let [nearby, property, catStr] = Array(3).fill("");

function filterCheck(zoom) {
  if (filters.checked == false) {
    apiType = "map/";
    apiZoom = `,${zoom}`;
    property = "";
    catStr = "";

    // grey out all filters too
  } else {
    apiType = "list/bbox=";
    apiZoom = "";
    catStr = "";
    for (const prop in category) {
      if (category[prop].checked == true) {
        catStr += `${category[prop].value},`;
      }
    }
    if (catStr.length > 1) {
      catStr = `category=${catStr.slice(0, catStr.length - 1)}/`;
    }
    console.log(catStr);
    if (live.checked == true && hd.checked == true) {
      property = "property=live,hd/";
    } else if (live.checked == true && hd.checked == false) {
      property = "property=live/";
    } else if (live.checked == false && hd.checked == true) {
      property = "property=hd/";
    }
  }
}

async function refreshCams(pos) {
  let myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("x-windy-key", "O1gjC9qelwQKifrT2vlmlmPK7A5F3MhJ");

  let requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  await fetch(
    `https://api.windy.com/api/webcams/v2/${apiType}${pos.Ab.j},${pos.Va.j},${pos.Ab.h},${pos.Va.h}${apiZoom}/orderby=random/${catStr}${property}limit=50&?show=webcams:category, image, location, map, player, property, statistics, url;properties;categories`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => updateMarkers(result))
    .catch((error) => console.log("error", error));
}

// clears markers from map and window text
function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers = [];
  infoText = [];

  for (let i = 0; i < bubbles.length; i++) {
    bubbles[i].setMap(null);
  }
  bubbles = [];
}

function updateMarkers(result) {
  console.log(result);
  filteredCount = 0;

  camimage = {
    url: function () {
      if (filters.checked == false) {
        return "https://adeels.ca/assets/icons/cam.png";
      } else if (live.checked == true) {
        return "https://adeels.ca/assets/icons/cam.png";
      }
    },
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 0),
  };

  // values for camera image, label box sizes
  let boxPaths = {
    1: "",
    2: "M 37.667,75.318 28.253,59.015 C 23.363382,58.880446 18.431789,59.337587 13.578168,58.669012 5.3675157,57.160976 -0.6687999,48.987657 0,40.724081 0.05498383,32.243353 -0.11230207,23.755185 0.08793213,15.279294 0.77863651,6.4338464 9.2734285,-0.66304946 18.075766,0.015 31.929808,0.04770532 45.787087,-0.05067707 59.639091,0.06466363 68.657304,0.5292434 76.032904,9.1335521 75.333,18.090766 75.27796,26.64321 75.445374,35.203099 75.24507,43.750706 74.554365,52.596154 66.059573,59.693049 57.257236,59.015 H 47.078002 l -9.411,16.303 z",
    3: "",
    4: "",
  };

  // for each camera returned
  // refreshing maps popup hide
  result.result.webcams.forEach((cam, index) => {
    filteredCount += cam.map.clustersize;
    // generate an info window
    const infowindow = new google.maps.InfoWindow({
      fullText: `
          <div id="camtext">
            <h3>${cam.title}</h3>
            <a id="thumb" href="#"><img src=${cam.image.current.thumbnail} alt="thumbnail" /></a>
            Watch <b><a href=http://webcams.windy.com/webcams/stream/${cam.id}>LIVE</b> | <b><a href=${cam.player.day.embed}>Timelapse</a></b>
            <ul>
                <li><b>Location:</b> <a href=${cam.location.wikipedia}>${cam.location.city}. ${cam.location.region}</a></li>
                <li><b>Coordinates:</b> ${cam.location.latitude}. ${cam.location.longitude}</li>
                <li><b>Views:</b> ${cam.statistics.views}</li>
            </ul>
            <br>

            </div>
            `,
      smallText: cam.title,
      content: cam.title,
      naxWidth: 400,

      disableAutoPan: true,
    });
    infoText.push(infowindow);

    // drop markers for cams on map
    window.setTimeout(() => {
      //if filters are off and there is a cluster to show, show cluster count.
      if (filters.checked == false && cam.map.clustersize > 1) {
        boxSize = cam.map.clustersize.toString().length;
        bubble = new google.maps.Marker({
          map,
          animation: google.maps.Animation.DROP,
          position: { lat: cam.location.latitude, lng: cam.location.longitude },
          label: {
            text: `${cam.map.clustersize}`,
            className: "bubbles",
          },
          icon: {
            path: `${boxPaths[2]}`,
            fillColor: "red",
            strokeColor: "black",
            strokeWeight: 1,
            scale: 0.4,
            strokeOpacity: 1.0,
            fillOpacity: 0.8,
            anchor: new google.maps.Point(0, 70),
          },
        });

        //add zoom in event listener to bubble
        bubble.addListener("click", function (event) {
          map.panTo(event.latLng);
          map.setZoom(map.getZoom() + 1);
        });
        bubbles.push(bubble);
      }

      //   } else if (cam.player.live.available == true) {
      //     bubble = new google.maps.Marker({
      //       map,
      //       animation: google.maps.Animation.DROP,
      //       position: { lat: cam.location.latitude, lng: cam.location.longitude },
      //       label: {
      //         text: "LIVE",
      //         className: "bubbles",
      //       },
      //       icon: {
      //         path: `${boxPaths[2]}`,
      //         fillColor: "red",
      //         strokeColor: "black",
      //         strokeWeight: 1,
      //         scale: 0.4,
      //         strokeOpacity: 1,
      //         fillOpacity: 0.7,
      //         anchor: new google.maps.Point(0, 70),
      //       },
      //     });
      //   }

      // drop the camera marker itself. click to open cam popup.
      const marker = new google.maps.Marker({
        map,
        animation: google.maps.Animation.DROP,
        position: { lat: cam.location.latitude, lng: cam.location.longitude },
        icon: camimage,
      });
      markers.push(marker);

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

      // on click, open zoom in one level, refresh cams.

      // on closeclick, close bigtext
      infowindow.addListener("closeclick", () => {
        infowindow.close({
          anchor: marker,
          map,
          shouldFocus: false,
        });
        infowindow.setContent(infowindow.smallText);
      });
    }, 35 * index);
  });

  total.innerText = `Total webcams: 55,490`;
  filtered.innerText = `Matching filters: ${filteredCount}`;
  shown.innerText = `Shown on map: ${result.result.limit}`;
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
  mid = map.getCenter().toJSON();

  infoWindow = new google.maps.InfoWindow();

  map.addListener("idle", () => {
    // refreshing maps popup
    pos = map.getBounds();
    mid = map.getCenter().toJSON();
    clearMarkers();
    filterCheck(map.zoom);
    refreshCams(pos);
  });

  map.addListener("dragend", () => {
    clearMarkers();
  });

  map.addListener("zoom_changed", () => {
    clearMarkers();
  });

  const locationButton = document.createElement("button");

  locationButton.textContent = "Locate Me";
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

//pop up load function
$(window).on("load", function () {
  $(".show-player").magnificPopup({
    type: "iframe",
    midClick: true,
    mainClass: "custom-popup-class",
  });
});

// checkbox function
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
