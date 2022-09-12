//JS
// bbox vs viewport?
// bbox handling when zoomed out, map edges. ***
//update how to use

// variables
let map, infoWindow, apiType, apiZoom, camImage;
let [resizing, restored] = [false, false];
let markers = [];
let bubbles = [];

let camFrame = document.getElementById("camframe");
let camModal = document.getElementById("camModal");
let welcomeModal = document.getElementById("welcomeModal");
let span = document.getElementsByClassName("close")[0];
let mapDiv = document.getElementById("map");
let loader = document.getElementById("loader");

let firstTime = document.getElementById("firsttime");
let help = document.getElementById("helpbox");

let filters = document.getElementById("filters");
let category = document.getElementsByClassName("category");
let live = document.getElementById("live");
let hd = document.getElementById("hd");
let total = document.getElementById("total");
let filtered = document.getElementById("filtered");
let shown = document.getElementById("shown");

let [nearby, property, catStr] = Array(3).fill("");

const controller = new AbortController();
const signal = controller.signal;

//restore the last selected options.

function restoreOptions() {
  if (
    localStorage.firstTime == "false" ||
    localStorage.firstTime == undefined ||
    localStorage.version !== version.innerText
  ) {
    welcomeModal.style.display = "block";
  }
  if (localStorage.live) {
    live.checked = JSON.parse(localStorage.live);
  }
  if (localStorage.hd) {
    hd.checked = JSON.parse(localStorage.hd);
  }
  if (localStorage.filters) {
    filters.checked = JSON.parse(localStorage.filters);
  }
  if (localStorage.catName) {
    category.curr = document.querySelector(`input[value=${localStorage.catName}]`);
    category.curr.checked = JSON.parse(localStorage.catValue);
    if (category.curr.checked == true) {
      document.querySelector(`label[class='dropdown-label']`).text = `Only show: ${category.curr.value}`;
      filters.checked = true;
    }
  } else if (!localStorage.catName) {
    localStorage.catValue = "false";
  }
  localStorage.version = version.innerText;
  restored = true;
}

//first time message box listener
firstTime.addEventListener("change", () => localStorage.setItem("firstTime", firstTime.checked));
help.addEventListener("click", () => (welcomeModal.style.display = "block"));

//show welcome and get total webcam count
window.onload = function () {
  let myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("x-windy-key", "O1gjC9qelwQKifrT2vlmlmPK7A5F3MhJ");

  let requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow",
  };

  fetch(`https://api.windy.com/api/webcams/v2/list/`, requestOptions)
    .then((response) => response.json())
    .then((result) => (total.innerText = result.result.total))
    .catch((error) => console.log("error", error));
};

// function to abort fetch to prevent excess marker drops
function abortRefresh() {
  console.log("Starting new refresh request...");
  controller.abort();
}

// to avoid 'idle' api event calls when resizing, set flag until resizing complete
window.addEventListener("resize", function () {
  resizing = true;
  clearTimeout(window.resizedFinished);
  window.resizedFinished = setTimeout(function () {
    resizing = false;
  }, 500);
});

// Modal event listener
// open modal if clicked on any live or timelapse link
window.addEventListener("click", function (e) {
  if (e.target.className == "popuplink") {
    camModal.style.display = "block";
    //close if clicked on X or outside of modal
  } else if (e.target.className == "close" || e.target.className == "modal") {
    camFrame.setAttribute("src", "about:blank");
    e.target.closest(".modal").style.display = "none";
  }
});

document.querySelector(".options").addEventListener("click", function (e) {
  //handle filter toggle on/off
  if (e.target.id == "filters") {
    if (filters.checked == false) {
      live.last = live.checked;
      hd.last = hd.checked;
      live.checked = false;
      hd.checked = false;
      if (category.curr) {
        category.last = category.curr.checked;
        category.curr.checked == false || category.curr.click();
      }
    } else {
      live.checked = live.last;
      hd.checked = hd.last;
      if (category.curr) {
        category.curr.checked == category.last || category.curr.click();
      }
      if (!localStorage.catName && !localStorage.live && !localStorage.hd) {
        live.checked = true;
        localStorage.live = live.checked;
      }
    }
  }

  //only allow one checked box, store last checked box.
  if (e.target.id == "live" || e.target.id == "hd" || e.target.className == "category") {
    if (e.target.className == "category") {
      //save the last checked category and its value. either deselecting, or about to unselect the last.
      localStorage.setItem(`catName`, e.target.value);
      localStorage.setItem(`catValue`, e.target.checked);

      if (document.querySelectorAll("[class='category']:checked").length >= 1) {
        category.curr = e.target;
        document.querySelectorAll("[class='category']:checked").forEach((box) => {
          if (box.checked == true && box.value != category.curr.value) {
            box.checked = false;
          }
        });
      } else {
        localStorage.setItem("category", "false");
      }
    } else if (e.target.id == "live" || e.target.id == "hd") {
      localStorage.setItem(`${e.target.id}`, e.target.checked);
    }

    //handle filter toggle being set if anything else is selected or unselected
    if (live.checked == true || hd.checked == true || localStorage.catValue == "true") {
      filters.checked = true;
    } else if (live.checked == false && hd.checked == false && localStorage.catValue == "false") {
      filters.checked = false;
    }
    localStorage.setItem("filters", filters.checked);
  }
});

//form API call string based on filters checked
function filterCheck(zoom) {
  //if no filters, use map call
  if (filters.checked == false) {
    apiType = "map/";
    apiZoom = `,${zoom}`;
    property = "";
    catStr = "";
    camImage = "icons/cam1.svg";
    camLabel = "icons/label4";

    //otherwise use list/bbox call with filters
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

    //set property query parameter and map marker icons
    if (live.checked == true && hd.checked == true) {
      property = "property=live,hd/";
      camImage = "icons/live2.svg";
    } else if (live.checked == true && hd.checked == false) {
      property = "property=live/";
      camImage = "icons/live2.svg";
    } else if (live.checked == false && hd.checked == true) {
      property = "property=hd/";
      camImage = "icons/cam2.svg";
    }
  }
}

//call windy API and get list of cams to display based on filters
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
    `https://api.windy.com/api/webcams/v2/${apiType}${pos.lat.hi},${pos.lng.hi},${pos.lat.lo},${pos.lng.lo}${apiZoom}/orderby=random/${catStr}${property}limit=50&?show=webcams:category, image, location, map, player, property, statistics, url;properties;categories`,
    requestOptions
  )
    .then((response) => response.json())
    .then((result) => updateMarkers(result))
    .catch((error) => console.log("error", error));
  loader.style.display = "none";
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

//place new markers on the map and generate infowindows and text
function updateMarkers(result) {
  console.log(result);
  filteredCount = 0;

  // for each camera returned
  // refreshing maps popup hide

  result.result.webcams.forEach((cam, index) => {
    if (filters.checked == false) {
      filteredCount += cam.map.clustersize;
    }
    if (cam.player.live.available == true) {
      watchText = `<div id="linkcontainer"><span class="watch"><b><a class="popuplink" target="modalcam" href=${cam.player.live.embed}>LIVE</a></b> | <b><a class="popuplink" target="modalcam" href=${cam.player.day.embed}>Timelapse</a></b></span></div>`;
      //watchText = `<div id="linkcontainer"><span class="watch"><b><a class="popuplink" target="modalcam" href=https://webcams.windy.com/webcams/stream/${cam.id}>LIVE</a></b> | <b><a class="popuplink" target="modalcam" href=${cam.player.day.embed}>Timelapse</a></b></span></div>`;
    } else {
      watchText = `<div id="linkcontainer"><span class="watch"><a class="popuplink" target="modalcam" href=${cam.player.day.embed}>Timelapse</a></b></span></div>`;
    }

    // generate an info window
    const infowindow = new google.maps.InfoWindow({
      fullText: `
          <div id="camtext">
            <h3>${cam.title}</h3>
            <a id="thumb" href="#"><img src=${cam.image.current.thumbnail} alt="thumbnail" /></a>
            ${watchText}
            <ul>
                <li><b>Location:</b> <a target="_blank" href=${cam.location.wikipedia}>${cam.location.city}. ${
        cam.location.region
      }</a></li>
                <li><b>Country:</b> ${cam.location.country}
                </li>
                <li><b>Coordinates:</b> ${parseFloat(cam.location.latitude).toFixed(3)}, ${parseFloat(
        cam.location.longitude
      ).toFixed(3)}</li>
                <li><b>Views:</b> ${cam.statistics.views}</li>
            </ul>
            <br>

            </div>
            `,
      smallText: `<div id="camtext"><a id="thumb" href="#"><img src=${cam.image.current.thumbnail} alt="thumbnail" /></a></div">
      <h4>${cam.title}</h4>`,
      content: `<div id="camtext"><a id="thumb" href="#"><img src=${cam.image.current.thumbnail} alt="thumbnail" /></a></div">
      <h4>${cam.title}</h4>`,
      // smallText: cam.title,
      // content: cam.title,
      maxWidth: 400,

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
            url: `${camLabel}${boxSize}.svg`,
            scaledSize: new google.maps.Size(34, 34),
            anchor: new google.maps.Point(5, 24),
            labelOrigin: new google.maps.Point(2, 4),
          },
          zindex: 0,
        });

        //add zoom in event listener to bubble
        bubble.addListener("click", function (event) {
          map.panTo(event.latLng);
          map.setZoom(map.getZoom() + 1);
        });
        bubbles.push(bubble);
      }

      // drop the camera marker itself. click to open cam popup.
      const marker = new google.maps.Marker({
        map,
        animation: google.maps.Animation.DROP,
        position: { lat: cam.location.latitude, lng: cam.location.longitude },
        icon: {
          url: camImage,
          scaledSize: new google.maps.Size(26, 26),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(0, 0),
        },
        zindex: 1,
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
        isOpen = marker;
        infowindow.open({
          anchor: marker,
          map,
          shouldFocus: false,
        });
        infowindow.setContent(infowindow.fullText);
        document.querySelector("#camtitle").innerText = cam.title;
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

      //close info windows if clicking outside
      map.addListener("click", () => {
        infowindow.close();
        infowindow.setContent(infowindow.smallText);
      });
    }, 35 * index);
  });

  if (filters.checked == false) {
    filtered.innerText = `${filteredCount}`;
    shown.innerText = `${result.result.total}*`;
  } else {
    filtered.innerText = `${result.result.total}`;
    shown.innerText = `${result.result.limit}`;
  }

  if (result.result.total > result.result.limit) {
    shown.style.color = "#ff5a1b";
  } else {
    shown.style.color = "#f4ff6f";
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 43.67225961466724, lng: -79.60014046738281 },
    zoom: 6,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    },
    streetViewControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    minZoom: 3,
  });

  pos = map.getBounds();
  mid = map.getCenter().toJSON();

  infoWindow = new google.maps.InfoWindow();

  refreshEvent = map.addListener("idle", () => {
    if (resizing == false) {
      if (loader.style.display == "block") {
        abortRefresh();
        clearMarkers();
        loader.style.display == "none";
      }
      offset = mapDiv.clientHeight / 2 + mapDiv.offsetTop + loader.clientHeight / 2;
      loader.style.top = `${offset}px`;
      loader.style.display = "block";
      pos = map.getBounds();
      pos.lat = pos[Object.keys(pos)[0]];
      pos.lng = pos[Object.keys(pos)[1]];
      mid = map.getCenter().toJSON();
      restored == true || restoreOptions();
      clearMarkers();
      filterCheck(map.zoom);
      refreshCams(pos);
    }
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

          //   infoWindow.setPosition(pos);
          //   infoWindow.setContent("Location found.");
          //   infoWindow.open(map);
          // map.setCenter(pos);
          map.panTo(pos);
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

// checkbox dropdown function
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
      // jquery code, don't need it anymore.
      // if (_this.$el.find(":checked").length >= 1) {
      //   _this.$inputs.prop("checked", false);
      //   e.currentTarget.checked = !e.currentTarget.checked;
      //   category.last = e.currentTarget;
      // } else {
      //   delete category.last;
      // }
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
      this.$label.html("Show All");
    } else if (checked.length === 1) {
      this.$label.html(`Only show: ${checked.parent("label").text()}`);
      // } else if (checked.length === this.$inputs.length) {
      //   this.$label.html("All Selected");
      //   this.areAllChecked = true;
      //   this.$checkAll.html("Uncheck All");
      // } else {
      //   this.$label.html(checked.length + " Selected");
    }
  };

  //   CheckboxDropdown.prototype.onCheckAll = function (checkAll) {
  //     if (!this.areAllChecked || checkAll) {
  //       this.areAllChecked = true;
  //       this.$checkAll.html("Uncheck All");
  //       this.$inputs.prop("checked", true);
  //     } else {
  //       this.areAllChecked = false;
  //       this.$checkAll.html("Check All");
  //       this.$inputs.prop("checked", false);
  //     }

  //     this.updateStatus();
  //   };

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

//don't iframe me bro
if (top.location != self.location) {
  top.location = self.location.href;
}
