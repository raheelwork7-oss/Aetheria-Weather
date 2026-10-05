const CONFIG = {
  API_KEY: '',
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  MAX_RECENT_SEARCHES: 5,
};

const state = {
  city: 'London',
  unit: localStorage.getItem('weather_unit') || 'C',
  theme: localStorage.getItem('weather_theme') || 'dark',
  weatherData: null,
  recentSearches: JSON.parse(localStorage.getItem('weather_recent')) || ['London', 'Tokyo', 'New York', 'Sydney'],
  clockInterval: null
};


const elements = {
  body: document.body,
  themeBtn: document.getElementById('theme-btn'),
  themeIcon: document.getElementById('theme-icon'),
  unitC: document.getElementById('unit-c'),
  unitF: document.getElementById('unit-f'),
  refreshBtn: document.getElementById('refresh-btn'),
  locationBtn: document.getElementById('location-btn'),
  searchForm: document.getElementById('search-form'),
  cityInput: document.getElementById('city-input'),
  clearSearchBtn: document.getElementById('clear-search'),
  recentSearchesContainer: document.getElementById('recent-searches'),
  loadingState: document.getElementById('loading-state'),
  errorState: document.getElementById('error-state'),
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
  errorRetryBtn: document.getElementById('error-retry-btn'),
  weatherContent: document.getElementById('weather-content'),
  locationName: document.getElementById('location-name'),
  locationTime: document.getElementById('location-time'),
  weatherBadge: document.getElementById('weather-badge'),
  currentTemp: document.getElementById('current-temp'),
  mainWeatherIcon: document.getElementById('main-weather-icon'),
  weatherDesc: document.getElementById('weather-desc'),
  feelsLike: document.getElementById('feels-like'),
  tempHigh: document.getElementById('temp-high'),
  tempLow: document.getElementById('temp-low'),
  precipChance: document.getElementById('precip-chance'),
  humidityVal: document.getElementById('humidity-val'),
  humidityStatus: document.getElementById('humidity-status'),
  windVal: document.getElementById('wind-val'),
  windUnitLabel: document.getElementById('wind-unit-label'),
  windDirIcon: document.getElementById('wind-dir-icon'),
  windDirText: document.getElementById('wind-dir-text'),
  uvVal: document.getElementById('uv-val'),
  uvBar: document.getElementById('uv-bar'),
  uvStatus: document.getElementById('uv-status'),
  visVal: document.getElementById('vis-val'),
  visStatus: document.getElementById('vis-status'),
  pressureVal: document.getElementById('pressure-val'),
  pressureStatus: document.getElementById('pressure-status'),
  sunriseTime: document.getElementById('sunrise-time'),
  sunsetTime: document.getElementById('sunset-time'),
  sunPositionDot: document.getElementById('sun-position-dot'),
  sunArcProgress: document.getElementById('sun-arc-progress'),
  hourlyContainer: document.getElementById('hourly-container'),
  dailyContainer: document.getElementById('daily-container')
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  if (value === 0) value = 1;

  return function next() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function generateMockData(cityName) {
  const normalizedName = (cityName || 'London').trim() || 'London';
  const rng = createSeededRandom(hashString(normalizedName));
  const baseTempC = Math.floor(rng() * 18) + 10;

  const conditions = [
    { main: 'Clear', desc: 'Sunny skies', icon: 'sun', bg: 'clear' },
    { main: 'Clouds', desc: 'Partly cloudy', icon: 'cloud-sun', bg: 'clouds' },
    { main: 'Rain', desc: 'Light rain showers', icon: 'cloud-rain', bg: 'rain' },
    { main: 'Thunderstorm', desc: 'Scattered thunderstorms', icon: 'cloud-lightning', bg: 'thunderstorm' }
  ];

  const cond = conditions[Math.floor(rng() * conditions.length)];
  const hourly = [];
  const currentHour = new Date().getHours();

  for (let i = 0; i < 12; i += 1) {
    const hourNum = (currentHour + i) % 24;
    const timeStr = i === 0 ? 'Now' : `${hourNum.toString().padStart(2, '0')}:00`;
    hourly.push({
      time: timeStr,
      tempC: baseTempC + Math.floor(Math.sin(i + hashString(normalizedName)) * 3),
      icon: i > 4 && i < 10 ? cond.icon : 'cloud',
      pop: Math.floor(rng() * 40)
    });
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIdx = new Date().getDay();
  const daily = [];

  for (let i = 0; i < 7; i += 1) {
    const dayName = i === 0 ? 'Today' : days[(todayIdx + i) % 7];
    daily.push({
      day: dayName,
      icon: i % 2 === 0 ? cond.icon : 'cloud-sun',
      condition: i % 2 === 0 ? cond.desc : 'Partly Cloudy',
      highC: baseTempC + Math.floor(rng() * 4) + 1,
      lowC: baseTempC - Math.floor(rng() * 4) - 2,
      pop: Math.floor(rng() * 60)
    });
  }

  return {
    city: normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1),
    country: 'Global',
    tempC: baseTempC,
    feelsLikeC: baseTempC - 1,
    highC: baseTempC + 3,
    lowC: baseTempC - 3,
    condition: cond.main,
    description: cond.desc,
    icon: cond.icon,
    bg: cond.bg,
    humidity: 62,
    windKm: 14,
    windDeg: 210,
    uv: 4.2,
    visibilityKm: 10.0,
    pressure: 1014,
    sunrise: '06:18 AM',
    sunset: '07:42 PM',
    precipChance: '15%',
    timezoneOffset: 0,
    hourly,
    daily
  };
}

async function fetchWeatherData(city) {
  showLoading();

  try {
    if (CONFIG.API_KEY) {
      const response = await fetch(
        `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=metric`
      );
      if (!response.ok) throw new Error('City not found');
      const data = await response.json();
      state.weatherData = formatApiData(data);
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      state.weatherData = generateMockData(city);
    }

    renderUI();
    addRecentSearch(state.weatherData.city);
    showContent();
  } catch (error) {
    showError('Location Not Found', error.message || 'Unable to retrieve weather details.');
  }
}

function formatApiData(data) {
  return {
    city: data.name,
    country: data.sys.country,
    tempC: Math.round(data.main.temp),
    feelsLikeC: Math.round(data.main.feels_like),
    highC: Math.round(data.main.temp_max),
    lowC: Math.round(data.main.temp_min),
    condition: data.weather[0].main,
    description: data.weather[0].description,
    icon: mapWeatherIcon(data.weather[0].main),
    bg: mapWeatherBg(data.weather[0].main),
    humidity: data.main.humidity,
    windKm: Math.round(data.wind.speed * 3.6),
    windDeg: data.wind.deg || 0,
    uv: 5.0,
    visibilityKm: (data.visibility / 1000).toFixed(1),
    pressure: data.main.pressure,
    sunrise: formatTime(data.sys.sunrise, data.timezone),
    sunset: formatTime(data.sys.sunset, data.timezone),
    precipChance: '10%',
    timezoneOffset: data.timezone,
    hourly: generateMockData(data.name).hourly,
    daily: generateMockData(data.name).daily
  };
}

function renderUI() {
  const data = state.weatherData;
  if (!data) return;

  elements.body.setAttribute('data-weather', data.bg);

  elements.locationName.textContent = `${data.city}${data.country ? ', ' + data.country : ''}`;
  elements.weatherBadge.textContent = data.condition;
  elements.currentTemp.textContent = convertTemp(data.tempC);
  elements.feelsLike.textContent = `${convertTemp(data.feelsLikeC)}Â°${state.unit}`;
  elements.tempHigh.textContent = `${convertTemp(data.highC)}Â°`;
  elements.tempLow.textContent = `${convertTemp(data.lowC)}Â°`;
  elements.weatherDesc.textContent = data.description;
  elements.precipChance.textContent = data.precipChance;

  elements.mainWeatherIcon.innerHTML = `<i data-lucide="${data.icon}"></i>`;

  startLiveClock(data.timezoneOffset);

  elements.humidityVal.textContent = data.humidity;
  elements.humidityStatus.textContent = data.humidity > 70 ? 'High Humidity' : data.humidity < 30 ? 'Dry Air' : 'Normal';

  elements.windVal.textContent = state.unit === 'F' ? Math.round(data.windKm * 0.621371) : data.windKm;
  elements.windUnitLabel.textContent = state.unit === 'F' ? 'mph' : 'km/h';
  elements.windDirIcon.style.transform = `rotate(${data.windDeg}deg)`;
  elements.windDirText.textContent = getCardinalDirection(data.windDeg);

  elements.uvVal.textContent = data.uv;
  elements.uvBar.style.width = `${(data.uv / 10) * 100}%`;
  elements.uvStatus.textContent = data.uv > 7 ? 'Very High' : data.uv > 5 ? 'Moderate' : 'Low Risk';

  elements.visVal.textContent = data.visibilityKm;
  elements.visStatus.textContent = data.visibilityKm >= 10 ? 'Clear Vision' : 'Reduced';

  elements.pressureVal.textContent = data.pressure;
  elements.pressureStatus.textContent = data.pressure > 1013 ? 'High Pressure' : 'Low Pressure';

  elements.sunriseTime.textContent = data.sunrise;
  elements.sunsetTime.textContent = data.sunset;
  updateSunPosition();

  elements.hourlyContainer.innerHTML = data.hourly.map(item => `
    <div class="hourly-item">
      <span class="hourly-time">${item.time}</span>
      <div class="hourly-icon"><i data-lucide="${item.icon}"></i></div>
      <span class="hourly-temp">${convertTemp(item.tempC)}Â°</span>
      <span class="hourly-precip"><i data-lucide="droplet" style="width:10px;"></i>${item.pop}%</span>
    </div>
  `).join('');

  elements.dailyContainer.innerHTML = data.daily.map(item => `
    <div class="daily-item">
      <span class="daily-day">${item.day}</span>
      <div class="daily-condition">
        <i data-lucide="${item.icon}"></i>
        <span>${item.condition}</span>
      </div>
      <span class="daily-precip">${item.pop}% rain</span>
      <div class="daily-temps">
        <span class="high">${convertTemp(item.highC)}Â°</span>
        <span class="low">${convertTemp(item.lowC)}Â°</span>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

function convertTemp(celsius) {
  if (state.unit === 'F') {
    return Math.round((celsius * 9 / 5) + 32);
  }
  return Math.round(celsius);
}

function mapWeatherIcon(main) {
  switch (main.toLowerCase()) {
    case 'clear': return 'sun';
    case 'clouds': return 'cloud';
    case 'rain':
    case 'drizzle': return 'cloud-rain';
    case 'thunderstorm': return 'cloud-lightning';
    case 'snow': return 'snowflake';
    default: return 'cloud-sun';
  }
}

function mapWeatherBg(main) {
  switch (main.toLowerCase()) {
    case 'clear': return 'clear';
    case 'clouds': return 'clouds';
    case 'rain':
    case 'drizzle': return 'rain';
    case 'thunderstorm': return 'thunderstorm';
    case 'snow': return 'snow';
    default: return 'clear';
  }
}

function getCardinalDirection(angle) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(angle / 45) % 8];
}

function formatTime(timestamp, timezoneOffsetSec = 0) {
  const date = new Date((timestamp + timezoneOffsetSec) * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function startLiveClock(timezoneOffsetSec = 0) {
  if (state.clockInterval) clearInterval(state.clockInterval);

  const updateClock = () => {
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localDate = new Date(utcMs + (timezoneOffsetSec * 1000));

    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    elements.locationTime.textContent = localDate.toLocaleDateString('en-US', options);
  };

  updateClock();
  state.clockInterval = setInterval(updateClock, 10000);
}

function updateSunPosition() {
  const hour = new Date().getHours();
  let progress = (hour - 6) / 12;
  progress = Math.max(0, Math.min(1, progress));

  const pathLength = 126;
  const offset = pathLength * (1 - progress);
  elements.sunArcProgress.style.strokeDashoffset = offset;

  const angle = Math.PI * progress;
  const cx = 50 - 40 * Math.cos(angle);
  const cy = 45 - 40 * Math.sin(angle);

  elements.sunPositionDot.setAttribute('cx', cx);
  elements.sunPositionDot.setAttribute('cy', cy);
}

function renderRecentSearches() {
  elements.recentSearchesContainer.innerHTML = state.recentSearches
    .map(city => `<button class="tag-btn" onclick="handleRecentClick('${city}')">${city}</button>`)
    .join('');
}

function addRecentSearch(city) {
  if (!city) return;
  state.recentSearches = [city, ...state.recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, CONFIG.MAX_RECENT_SEARCHES);
  localStorage.setItem('weather_recent', JSON.stringify(state.recentSearches));
  renderRecentSearches();
}

window.handleRecentClick = (city) => {
  state.city = city;
  fetchWeatherData(city);
};

function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.errorState.classList.add('hidden');
  elements.weatherContent.classList.add('hidden');
}

function showContent() {
  elements.loadingState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.weatherContent.classList.remove('hidden');
}

function showError(title, msg) {
  elements.loadingState.classList.add('hidden');
  elements.weatherContent.classList.add('hidden');
  elements.errorState.classList.remove('hidden');
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = msg;
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  elements.body.setAttribute('data-theme', state.theme);
  localStorage.setItem('weather_theme', state.theme);
  elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');
  lucide.createIcons();
}

function setUnit(unit) {
  if (state.unit === unit) return;
  state.unit = unit;
  localStorage.setItem('weather_unit', unit);

  elements.unitC.classList.toggle('active', unit === 'C');
  elements.unitC.setAttribute('aria-checked', unit === 'C');
  elements.unitF.classList.toggle('active', unit === 'F');
  elements.unitF.setAttribute('aria-checked', unit === 'F');

  if (state.weatherData) renderUI();
}

function initEvents() {
  elements.themeBtn.addEventListener('click', toggleTheme);

  elements.unitC.addEventListener('click', () => setUnit('C'));
  elements.unitF.addEventListener('click', () => setUnit('F'));

  elements.refreshBtn.addEventListener('click', () => fetchWeatherData(state.city));
  elements.errorRetryBtn.addEventListener('click', () => fetchWeatherData(state.city));

  elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = elements.cityInput.value.trim();
    if (query) {
      state.city = query;
      fetchWeatherData(query);
      elements.cityInput.value = '';
      elements.clearSearchBtn.classList.add('hidden');
    }
  });

  elements.cityInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
      elements.clearSearchBtn.classList.remove('hidden');
    } else {
      elements.clearSearchBtn.classList.add('hidden');
    }
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.cityInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    elements.cityInput.focus();
  });

  elements.locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      showLoading();
      navigator.geolocation.getCurrentPosition(
        () => {
          fetchWeatherData('London');
        },
        () => {
          showError('Location Access Denied', 'Please enable location permissions in your browser or search manually.');
        }
      );
    } else {
      showError('Not Supported', 'Geolocation is not supported by your browser.');
    }
  });
}

function init() {
  elements.body.setAttribute('data-theme', state.theme);
  elements.themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'moon' : 'sun');

  elements.unitC.classList.toggle('active', state.unit === 'C');
  elements.unitF.classList.toggle('active', state.unit === 'F');

  renderRecentSearches();
  initEvents();
  fetchWeatherData(state.city);
}

document.addEventListener('DOMContentLoaded', init);
