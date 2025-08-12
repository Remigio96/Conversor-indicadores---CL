
<img width="4096" height="2731" alt="bandera" src="https://github.com/user-attachments/assets/6d26a598-1ef9-437e-a8db-6997fc223fb7" />

## Conversor de Monedas Nacional para Chile

Este proyecto es una aplicación web que permite convertir montos en pesos chilenos (CLP), así como visualizar diferentes indicadores económicos nacionales obtenidos desde la API de [mindicador.cl](https://mindicador.cl/). Mostrando la evolución histórica de cada indicador seleccionado en un gráfico interactivo usando **Chart.js**.

## Características principales

* Obtiene datos en vivo desde la API de **mindicador.cl**.
* Fallback automático a un archivo JSON local en caso de que la API esté caída (modo offline).
* Conversión directa de CLP a la unidad seleccionada (UF, dólar, euro, etc.) cuando aplica.
* Visualización de la serie histórica de los últimos 10 días para cada indicador.
* Formateo automático del valor según su unidad de medida (Pesos, Porcentaje, Dólar, etc.).
* Interfaz responsiva y moderna.

## Tecnologías utilizadas

* **HTML5**, **CSS3** y **JavaScript (ES6+)**
* **Chart.js** para gráficos
* **Fetch API** para consumo de datos

## Requisitos previos

* Conexión a internet para datos en vivo (o archivo JSON local para modo offline).

## Instalación y ejecución

1. Clonar el repositorio:

```bash
git clone git@github.com:Remigio96/Conversor-indicadores---CL.git
```

2. Abrir el archivo `index.html` en el navegador.

## Uso

1. Ingresar el monto en CLP (si el indicador seleccionado es en pesos).
2. Seleccionar el indicador deseado del menú desplegable.
3. Presionar el botón **Buscar** para obtener el valor convertido y el gráfico histórico.
4. Si el indicador no requiere monto (por ejemplo, IPC, Bitcoin, etc.), se mostrará directamente su valor actual.

## Estructura del proyecto

```
.
│
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── data/
│   │   └── mindicador.json
│   └── img/
│       └── favicon.png
│
├── assets/js/
│   └── script.js
│
├── index.html
└── README.md
```

## Live Preview
<img width="1042" height="902" alt="image" src="https://github.com/user-attachments/assets/da738554-157c-4d7d-ac78-dea4003b76a7" />

https://remigio96.github.io/Conversor-indicadores---CL/

## Modo offline

Si la API de mindicador.cl no está disponible:

* Se utilizarán los datos del archivo local `mindicador.json`.
* La serie histórica se reemplazará por datos "planos" con el valor actual repetido.

## Autor

Desarrollado por **Remigio Stocker**.
