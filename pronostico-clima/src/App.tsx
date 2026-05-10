import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { Sun, Moon, CloudRain, CloudSnow, Sunrise, Sunset, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import './App.css'

const AvatarScene = lazy(() => import('./AvatarScene'));

const getWeatherIcon = (isDay: boolean, rain: number, snowfall: number, className = 'w-6 h-6') => {
  if (snowfall > 0) return <CloudSnow className={className} />;
  if (rain > 0) return <CloudRain className={className} />;
  return isDay ? <Sun className={className} /> : <Moon className={className} />;
};

const getHeroDecoration = (isDay: boolean, rain: number, snowfall: number) => {
  const Icon = snowfall > 0 ? CloudSnow : rain > 0 ? CloudRain : isDay ? Sun : Moon;
  return <Icon className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-[0.07] rotate-12 pointer-events-none" />;
};

const getWeatherDescription = (isDay: boolean, rain: number, snowfall: number) => {
  if (snowfall > 0) return 'Nevando';
  if (rain > 0) return 'Lloviendo';
  return isDay ? 'Despejado / Soleado' : 'Despejado';
};

const getWeatherPhrase = (isDay: boolean, rain: number, snowfall: number) => {
  if (snowfall > 0) return 'Abrígate bien, es tiempo de chocolate caliente y bufandas. ❄️';
  if (rain > 0) return 'Un día perfecto para un buen café y escuchar la lluvia. 🌧️☕';
  return isDay 
    ? 'El sol brilla hoy, ¡aprovecha y recarga energías! ☀️' 
    : 'Una noche tranquila y perfecta para descansar. 🌙✨';
};

function App() {
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('weather_username'))
  const [isNameModalOpen, setIsNameModalOpen] = useState(!localStorage.getItem('weather_username'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no es soportada por tu navegador');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      (err) => {
        setError('Error al obtener la ubicación: ' + err.message);
        setLoading(false);
      }
    );
  }, []);

  // Geocodificación Inversa: Solo 1 vez
  useEffect(() => {
    if (!coords) return;
    const fetchLocation = async () => {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}`;
      const geoResponse = await fetch(geoUrl);
      if (geoResponse.ok) {
        const geoJson = await geoResponse.json();
        const city = geoJson.address.city || geoJson.address.town || geoJson.address.village || geoJson.address.county;
        const country = geoJson.address.country;
        const code = geoJson.address.country_code;
        
        if (code) setCountryCode(code.toUpperCase());
        if (city && country) {
          setLocationName(`${city}, ${country}`);
        } else if (geoJson.display_name) {
          setLocationName(geoJson.display_name);
        }
      }
    };
    fetchLocation();
  }, [coords]);

  // Fetch Clima: Se ejecuta 1 vez y luego se sincroniza con el cambio exacto de hora
  useEffect(() => {
    if (!coords) return;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const fetchWeather = async () => {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=sunset,sunrise,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,rain&current=temperature_2m,is_day,snowfall,rain,precipitation,showers&timezone=auto`;
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) throw new Error('Error al obtener los datos del clima');
        const weatherJson = await weatherResponse.json();
        setWeatherData(weatherJson);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false); // Solo afecta el primer load real
      }
    };

    fetchWeather();

    // Sincronizar el próximo fetch al cambio exacto de hora para no saturar el API
    const now = new Date();
    const msToNextHour = 3600000 - (now.getMinutes() * 60000 + now.getSeconds() * 1000 + now.getMilliseconds());

    timeoutId = setTimeout(() => {
      fetchWeather(); // Actualiza apenas cambia la hora
      intervalId = setInterval(fetchWeather, 3600000); // Y luego sigue actualizando cada 1 hora exactamente
    }, msToNextHour);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [coords]);

  // Manejo de Fondo y Animación Inicial de la UI
  useEffect(() => {
    if (!loading && weatherData && weatherData.current) {
      const { is_day, rain, showers, snowfall } = weatherData.current;
      const isDay = is_day === 1;
      const isRaining = rain > 0 || showers > 0;
      const isSnowing = snowfall > 0;

      let bgImage = '';
      if (isSnowing) {
        bgImage = isDay ? '/images/diaNevado.jpg' : '/images/nocheNevada.jpg';
      } else if (isRaining) {
        bgImage = isDay ? '/images/diaLluvioso.jpg' : '/images/nocheLluviosa.jpg';
      } else {
        bgImage = isDay ? '/images/diaDespejado.jpg' : '/images/nocheDespejada.jpg';
      }

      document.body.style.backgroundImage = `url(${bgImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.transition = 'background-image 0.5s ease-in-out';
      // Ya no hay animaciones de entrada, el UI aparece instantáneamente
    } else if (!weatherData) {
      document.body.style.backgroundImage = 'none';
    }
  }, [loading, weatherData]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] absolute inset-0 z-50">
        {/* BRANDING: MyKumo in Loading Screen */}
        <div className="absolute top-6 left-6 md:top-8 md:left-10 z-30 flex items-center gap-3">
          <img src="/images/logo.png" alt="MyKumo Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md object-contain" />
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-widest drop-shadow-md">MyKumo</h1>
        </div>

        <div className="relative flex items-center justify-center w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-blue-400/20 rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <div className="absolute inset-2 border-4 border-purple-400/40 rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
          <div className="absolute inset-4 border-4 border-white/60 rounded-full animate-[spin_3s_linear_infinite] border-t-transparent"></div>
          <Sun className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
        </div>
        <h2 className="text-3xl font-light tracking-wider mb-3 drop-shadow-md">Detectando Ubicación</h2>
        <p className="text-white/60 text-base font-medium animate-pulse tracking-wide">Preparando tu pronóstico del clima...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] p-6 text-center absolute inset-0 z-50">
        <div className="absolute top-6 left-6 md:top-8 md:left-10 z-30 flex items-center gap-3">
          <img src="/images/logo.png" alt="MyKumo Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md object-contain" />
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-widest drop-shadow-md">MyKumo</h1>
        </div>

        <div className="bg-white/10 p-8 md:p-12 rounded-[2rem] border border-white/20 backdrop-blur-xl shadow-2xl max-w-lg w-full">
          <MapPin className="w-16 h-16 text-white/50 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-light text-white mb-4">Ubicación Necesaria</h2>
          <p className="text-white/70 text-base md:text-lg font-light leading-relaxed">
            Para poder mostrarte el pronóstico exacto del clima y disfrutar del entorno 3D, MyKumo requiere que permitas el acceso a tu ubicación en el navegador.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors font-medium shadow-lg"
          >
            Conceder Permiso / Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData) return null;

  const { current, hourly, daily } = weatherData;
  const isDay = current.is_day === 1;

  // Procesar datos por hora (próximas 8 horas para el carrusel)
  const nowMs = Date.now();
  let startIndex = hourly.time.findIndex((t: string) => new Date(t).getTime() >= nowMs - 3600000);
  if (startIndex === -1) startIndex = 0;

  const nextHours = [];
  for (let i = startIndex; i < startIndex + 8 && i < hourly.time.length; i++) {
    const timeDate = new Date(hourly.time[i]);
    const isCurrentHour = i === startIndex;
    nextHours.push({
      timeLabel: isCurrentHour ? 'Ahora' : timeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: hourly.temperature_2m[i],
      rain: hourly.rain[i],
      snowfall: 0, 
      isDay: timeDate.getHours() >= 6 && timeDate.getHours() < 18,
    });
  }

  // Procesar datos diarios
  const dailyData = [];
  for (let i = 0; i < daily.time.length; i++) {
    const dDate = new Date(daily.time[i] + 'T00:00:00');
    const sunriseDate = new Date(daily.sunrise[i]);
    const sunsetDate = new Date(daily.sunset[i]);
    
    dailyData.push({
      dateLabel: i === 0 ? 'Hoy' : dDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', ''),
      sunrise: sunriseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sunset: sunsetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      rain: 0,
      snowfall: 0
    });
  }

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -250, behavior: 'smooth' });
  };
  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 250, behavior: 'smooth' });
  };

  return (
    <>
      {isNameModalOpen && !loading && weatherData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white/10 p-8 rounded-[2rem] border border-white/20 backdrop-blur-xl shadow-2xl text-center max-w-sm w-full mx-4">
            <h2 className="text-2xl font-light text-white mb-6">¿Cómo te llamas?</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = new FormData(e.currentTarget).get('username') as string;
              if (val.trim()) {
                localStorage.setItem('weather_username', val.trim());
                setUserName(val.trim());
                setIsNameModalOpen(false);
              }
            }}>
              <input name="username" autoFocus type="text" autoComplete="off" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/40 transition-colors mb-6 text-center text-lg placeholder:text-white/30" placeholder="Tu nombre..." />
              <button type="submit" className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 rounded-xl transition-colors shadow-lg">
                Comenzar
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="h-auto min-h-screen lg:h-screen w-full overflow-x-hidden overflow-y-auto lg:overflow-hidden flex flex-col px-6 md:px-10 lg:px-14 py-4 md:py-6 lg:py-8 pb-12 lg:pb-8 relative">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-0 pointer-events-none"></div>

        {/* BRANDING: MyKumo (Flow Layout) */}
        <div className="relative z-20 flex items-center gap-3 mb-2 md:mb-4 w-full mx-auto">
          <img src="/images/logo.png" alt="MyKumo Logo" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md object-contain" />
          <h1 className="text-white text-xl md:text-2xl font-bold tracking-widest drop-shadow-md">MyKumo</h1>
        </div>

        <div className="relative z-10 w-full mx-auto flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-stretch justify-center pb-6">
        
        {/* COLUMNA IZQUIERDA: Weekly Summary */}
        <div className="w-full lg:w-[25%] lg:flex-none flex flex-col rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl text-white p-6 justify-between h-auto lg:h-full min-h-[400px]">
          <h3 className="text-white/80 text-sm uppercase tracking-widest font-bold mb-2 ml-2 flex-none">Pronóstico de 7 días</h3>
          
          <div className="flex-1 flex flex-col justify-between">
            {dailyData.map((day, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors border-b border-white/5 last:border-0">
                <div className="flex-1">
                  <div className="font-medium text-base capitalize">{day.dateLabel}</div>
                  <div className="flex items-center gap-3 text-xs opacity-70 mt-1">
                    <span className="flex items-center gap-1"><Sunrise className="w-3 h-3" /> {day.sunrise}</span>
                    <span className="flex items-center gap-1"><Sunset className="w-3 h-3" /> {day.sunset}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 flex-none">
                  {getWeatherIcon(true, day.rain, day.snowfall, "w-6 h-6 opacity-90 drop-shadow-sm")}
                  <div className="flex flex-col items-end min-w-[50px]">
                    <span className="font-bold text-lg">{Math.round(day.tempMax)}°</span>
                    <span className="text-xs opacity-60 font-medium">{Math.round(day.tempMin)}°</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA CENTRAL: Hero Card y Hourly Scroll Carrusel */}
        <div className="w-full lg:w-[45%] lg:flex-none flex flex-col gap-6 justify-center h-full">
          {/* 1. Hero Card */}
          <div className="flex-1 w-full relative overflow-hidden flex flex-col items-center justify-center p-10 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl text-white min-h-[300px]">
            {getHeroDecoration(isDay, current.rain + current.showers, current.snowfall)}
            
            {userName && (
              <div className="text-xl lg:text-2xl font-light opacity-90 mb-2 z-10 italic">
                Hola, {userName} 👋
              </div>
            )}
            <div className="flex items-center gap-2 text-lg font-light opacity-80 mb-6 z-10">
              <MapPin className="w-5 h-5" />
              {countryCode && <img src={`https://flagsapi.com/${countryCode}/flat/24.png`} alt="Flag" className="w-6 h-6 shadow-sm drop-shadow-md rounded-sm" />}
              <span>{locationName || 'Ubicación desconocida'}</span>
            </div>
            
            <div className="text-9xl font-bold tracking-tighter mb-6 drop-shadow-lg z-10">
              {Math.round(current.temperature_2m)}°
            </div>
            
            <div className="flex items-center gap-4 text-2xl font-medium opacity-90 z-10">
              {getWeatherIcon(isDay, current.rain + current.showers, current.snowfall, "w-10 h-10 drop-shadow-md")}
              <span className="capitalize">{getWeatherDescription(isDay, current.rain + current.showers, current.snowfall)}</span>
            </div>
          </div>

          {/* 2. Hourly Scroll (Carrusel interactivo) */}
          <div className="w-full flex-none flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 w-full">
              <button onClick={scrollLeft} className="p-2 hover:bg-white/20 transition-colors bg-white/10 rounded-full backdrop-blur-md text-white/80 hover:text-white border border-white/10 shadow-lg shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div ref={scrollRef} className="flex-1 flex gap-4 overflow-x-auto px-4 snap-x hide-scrollbar scroll-smooth">
                {nextHours.map((hourData, i) => (
                  <div key={i} className="snap-center shrink-0 flex flex-col items-center justify-between py-4 px-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 shadow-lg text-white transition-transform hover:scale-105">
                    <span className="text-sm font-medium opacity-80">{hourData.timeLabel}</span>
                    <div className="my-3">
                      {getWeatherIcon(hourData.isDay, hourData.rain, hourData.snowfall, "w-8 h-8 drop-shadow-md")}
                    </div>
                    <span className="text-xl font-semibold">{Math.round(hourData.temp)}°</span>
                  </div>
                ))}
              </div>

              <button onClick={scrollRight} className="p-2 hover:bg-white/20 transition-colors bg-white/10 rounded-full backdrop-blur-md text-white/80 hover:text-white border border-white/10 shadow-lg shrink-0">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Frase y Avatar 3D */}
        <div className="w-full lg:w-[30%] lg:flex-none flex flex-col gap-6 justify-center items-center h-auto lg:h-full">
          {/* Frase Dinámica */}
          <div className="w-full p-6 rounded-[2rem] bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg text-white text-center text-xl font-light italic opacity-90 z-20">
            "{getWeatherPhrase(isDay, current.rain + current.showers, current.snowfall)}"
          </div>

          {/* Contenedor del Avatar 3D */}
          <div className="flex-1 w-full min-h-[350px] relative rounded-[2rem] bg-transparent flex items-center justify-center overflow-visible z-10">
            <Suspense fallback={null}>
              <AvatarScene />
            </Suspense>

            {/* Créditos del Modelo 3D */}
            <div className="absolute bottom-2 right-4 z-20">
              <a 
                href="https://www.artstation.com/blackstercat" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-white/30 hover:text-white/80 text-[10px] md:text-xs font-light tracking-wide transition-colors"
              >
                Avatar by Blackstercat
              </a>
            </div>
          </div>
        </div>

      </div>
      
      {/* FOOTER */}
      <div className="relative lg:absolute lg:bottom-3 lg:left-0 w-full text-center z-10 py-4 lg:py-0">
        <p className="text-white/50 text-xs md:text-sm font-light drop-shadow-md">
          <a href="https://carolina-portafolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white hover:underline transition-colors">Conoce a la creadora</a>
        </p>
      </div>
    </div>
    </>
  )
}

export default App
