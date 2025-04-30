import React, { useState, useEffect } from "react";

const API_KEY = '5e69568b301f67a419b6335dd6281bf4';

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const WeatherApp = () => {
  const [cityInput, setCityInput] = useState("");
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState("dark"); // theme state: "dark" or "light"

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === "dark" ? "light" : "dark"));
  };

  const getAirQuality = (lat, lon) => {
    const airQualityUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    fetch(airQualityUrl)
      .then(res => res.json())
      .then(data => {
        if (data.list && data.list.length > 0) {
          setAirQuality(data.list[0]);
        } else {
          setAirQuality(null);
        }
      })
      .catch(error => {
        console.error('Air Quality API Error:', error);
        setAirQuality(null);
      });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWeatherDetails = (name, lat, lon, country, state) => {
    setLoading(true);
    setError(null);
    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    fetch(weatherApiUrl)
      .then(res => {
        if (!res.ok) {
          console.error('Weather API Error:', {
            status: res.status,
            statusText: res.statusText,
            url: weatherApiUrl
          });
          throw new Error(`Weather data not found (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        setCurrentWeather({
          name,
          lat,
          lon,
          country,
          state,
          data,
          date: new Date(),
          sunriseTime: formatTime(data.sys.sunrise),
          sunsetTime: formatTime(data.sys.sunset)
        });
        getAirQuality(lat, lon);
        getForecast(lat, lon);
        setLoading(false);
      })
      .catch(error => {
        console.error('Weather API Error Details:', error);
        setError(error.message);
        setLoading(false);
      });
  };

  const getForecast = (lat, lon) => {
    const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    fetch(forecastApiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Forecast data not found (${res.status})`);
        return res.json();
      })
      .then(data => {
        const hourlyData = data.list.slice(0, 8);
        setHourlyForecast(hourlyData);

        const uniqueDays = [];
        const dailyData = data.list.reduce((acc, item) => {
          const date = new Date(item.dt * 1000);
          const dateStr = date.toDateString();

          if (!uniqueDays.includes(dateStr) && date.getDate() !== new Date().getDate()) {
            uniqueDays.push(dateStr);
            acc.push(item);
          }

          return acc;
        }, []).slice(0, 5);

        setDailyForecast(dailyData);
      })
      .catch(error => {
        console.error('Forecast API Error Details:', error);
        setError(error.message);
      });
  };

  const getCityCoordinates = () => {
    if (!cityInput.trim()) {
      alert("Please enter a city name");
      return;
    }
    setLoading(true);
    setError(null);
    const city = cityInput.trim();
    setCityInput("");
    const geocodingApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`;

    fetch(geocodingApiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`City not found (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!data.length) throw new Error('City not found in database');
        const { name, lat, lon, country, state } = data[0];
        getWeatherDetails(name, lat, lon, country, state);
      })
      .catch(error => {
        console.error('Geocoding Error Details:', error);
        alert(`Error finding city: ${error.message}`);
        setLoading(false);
      });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude: lat, longitude: lon } = position.coords;
          fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
            .then(res => res.json())
            .then(data => {
              if (data.length > 0) {
                const { name, country, state } = data[0];
                getWeatherDetails(name, lat, lon, country, state);
              } else {
                getWeatherDetails("Current Location", lat, lon, "", "");
              }
            })
            .catch(error => {
              console.error('Reverse Geocoding Error:', error);
              getWeatherDetails("Current Location", lat, lon, "", "");
            });
        },
        error => {
          console.error('Geolocation Error:', error);
          alert("Unable to get your location. Please allow location access or search for a city manually.");
          setLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className={`container ${theme === "light" ? "light-theme" : ""}`}>
      <div className="header">
        <h2>Moosam</h2>
        <div className="theme-toggle">
          <label className="switch">
            <input type="checkbox" onChange={toggleTheme} checked={theme === "light"} />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="weather-input">
          <input
            type="text"
            id="city-input"
            placeholder="Enter city name"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                getCityCoordinates();
              }
            }}
            disabled={loading}
          />
          <button id="Searchbtn" onClick={getCityCoordinates} disabled={loading}>
            <i className="fa-regular fa-search"></i>Search
          </button>
          <button id="locationbtn" onClick={getCurrentLocation} disabled={loading}>
            <i className="bx bx-target-lock"></i>Current Location
          </button>
        </div>
      </div>
      <div className="weather-data">
        <div className="weather-left">
          <div className="card">
            {currentWeather ? (
              <>
                <div className="current-weather">
                  <div className="details">
                    <p>Now</p>
                    <h2>{currentWeather.data.main.temp.toFixed(1)}°C</h2>
                    <p>{currentWeather.data.weather[0].description}</p>
                  </div>
                  <div className="weather-icon">
                    <img
                      src={`https://openweathermap.org/img/wn/${currentWeather.data.weather[0].icon}@2x.png`}
                      alt={currentWeather.data.weather[0].description}
                    />
                  </div>
                </div>
                <hr />
                <div className="card-footer">
                  <p>
                    <i className="fa-light fa-calendar"></i>
                    {days[currentWeather.date.getDay()]}, {currentWeather.date.getDate()} {months[currentWeather.date.getMonth()]} {currentWeather.date.getFullYear()}
                  </p>
                  <p>
                    <i className="fa-light fa-location-dot"></i>
                    {currentWeather.name}, {currentWeather.state ? currentWeather.state + ", " : ""}{currentWeather.country}
                  </p>
                </div>
              </>
            ) : (
              <div className="current-weather">
                <div className="details">
                  <p>Now</p>
                  <h2>--°C</h2>
                  <p>--</p>
                </div>
                <div className="weather-icon">
                  <img src="" alt="weather" />
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <h2>5 Days Forecast</h2>
            <div className="day-forecast">
              {dailyForecast.length > 0 ? (
                dailyForecast.map((item, index) => {
                  const date = new Date(item.dt * 1000);
                  return (
                    <div className="forecast-item" key={index}>
                      <div className="icon-wrapper">
                        <img
                          src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                          alt={item.weather[0].description}
                        />
                        <span>{item.main.temp.toFixed(1)}°C</span>
                      </div>
                      <p>{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                      <p>{item.weather[0].description}</p>
                    </div>
                  );
                })
              ) : (
                <div className="forecast-item">
                  <div className="icon-wrapper">
                    <img src="" alt="loading" />
                    <span>--°C</span>
                  </div>
                  <p>--</p>
                  <p>--</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="weather-right">
          <h2>Today's Highlights</h2>
          <div className="highlights">
            <div className="card">
              <div className="card-head">
                <p>Air Quality Index</p>
                <p className={`air-index api-${airQuality ? airQuality.main.aqi : 0}`}>
                  {airQuality
                    ? ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][airQuality.main.aqi - 1]
                    : '--'}
                </p>
              </div>
              <div className="air-indices">
                <i className="fa-solid fa-wind fa-3x"></i>
                {["pm2_5", "pm10", "so2", "co", "no", "no2", "nh3", "o3"].map((item, index) => (
                  <div className="item" key={index}>
                    <p>{item.toUpperCase().replace('_', '.')}</p>
                    <h2>{airQuality ? airQuality.components[item] : '--'}</h2>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <p>sunrise & sunset</p>
              </div>
              <div className="sunrise-sunset">
                {currentWeather ? (
                  <>
                    <div className="item">
                      <div className="icon">
                        <i className="fa-light fa-sunrise fa-4x"></i>
                      </div>
                      <div>
                        <p>Sunrise</p>
                        <h2>{currentWeather.sunriseTime}</h2>
                      </div>
                    </div>
                    <div className="item">
                      <div className="icon">
                        <i className="fa-light fa-sunset fa-4x"></i>
                      </div>
                      <div>
                        <p>Sunset</p>
                        <h2>{currentWeather.sunsetTime}</h2>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="item">
                      <div className="icon">
                        <i className="fa-light fa-sunrise fa-4x"></i>
                      </div>
                      <div>
                        <p>Sunrise</p>
                        <h2>--</h2>
                      </div>
                    </div>
                    <div className="item">
                      <div className="icon">
                        <i className="fa-light fa-sunset fa-4x"></i>
                      </div>
                      <div>
                        <p>Sunset</p>
                        <h2>--</h2>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            {[
              { label: "Humidity", value: currentWeather ? currentWeather.data.main.humidity : '--', unit: "%" },
              { label: "Pressure", value: currentWeather ? currentWeather.data.main.pressure : '--', unit: "hPa" },
              { label: "Visibility", value: currentWeather ? (currentWeather.data.visibility / 1000).toFixed(1) : '--', unit: "km" },
              { label: "Wind speed", value: currentWeather ? currentWeather.data.wind.speed : '--', unit: "m/s" },
              { label: "Feels Like", value: currentWeather ? currentWeather.data.main.feels_like.toFixed(1) : '--', unit: "°C" },
            ].map((item, index) => (
              <div className="card" key={index}>
                <div className="card-head">
                  <p>{item.label}</p>
                </div>
                <div className="card-item">
                  <i
                    className={`fa-light ${
                      item.label === "Humidity"
                        ? "fa-droplet"
                        : item.label === "Pressure"
                        ? "fa-compass"
                        : item.label === "Visibility"
                        ? "fa-eye"
                        : item.label === "Wind speed"
                        ? "fa-location-arrow"
                        : "fa-temperature-list"
                    } fa-2x`}
                  ></i>
                  <h2>{item.value}{item.unit}</h2>
                </div>
              </div>
            ))}
          </div>
          <h2>Today at</h2>
          <div className="hourly-forecast">
            {hourlyForecast.length > 0 ? (
              hourlyForecast.map((item, index) => (
                <div className="card" key={index}>
                  <p>{formatTime(item.dt)}</p>
                  <img
                    src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                    alt={item.weather[0].description}
                  />
                  <p>{item.main.temp.toFixed(1)}°C</p>
                </div>
              ))
            ) : (
              [...Array(8)].map((_, index) => (
                <div className="card" key={index}>
                  <p>--</p>
                  <img src="" alt="weather" />
                  <p>--°C</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {loading && <div className="loading-overlay">Loading...</div>}
      {error && <div className="error-message">Error: {error}</div>}
    </div>
  );
};

export default WeatherApp;
