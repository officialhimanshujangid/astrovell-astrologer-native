import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Rect, Polygon } from 'react-native-svg';

const { width } = Dimensions.get('window');
// Leave some padding
const CHART_SIZE = width - 40;

const HouseRegions = [
  { house: 1, planetCx: 0.5, planetCy: 0.22, rasiX: 0.47, rasiY: 0.06 },
  { house: 2, planetCx: 0.25, planetCy: 0.12, rasiX: 0.08, rasiY: 0.06 },
  { house: 3, planetCx: 0.12, planetCy: 0.25, rasiX: 0.08, rasiY: 0.15 },
  { house: 4, planetCx: 0.25, planetCy: 0.5, rasiX: 0.45, rasiY: 0.45 },
  { house: 5, planetCx: 0.12, planetCy: 0.75, rasiX: 0.08, rasiY: 0.85 },
  { house: 6, planetCx: 0.25, planetCy: 0.88, rasiX: 0.08, rasiY: 0.93 },
  { house: 7, planetCx: 0.5, planetCy: 0.78, rasiX: 0.47, rasiY: 0.93 },
  { house: 8, planetCx: 0.75, planetCy: 0.88, rasiX: 0.92, rasiY: 0.93 },
  { house: 9, planetCx: 0.88, planetCy: 0.75, rasiX: 0.92, rasiY: 0.85 },
  { house: 10, planetCx: 0.75, planetCy: 0.5, rasiX: 0.53, rasiY: 0.45 },
  { house: 11, planetCx: 0.88, planetCy: 0.25, rasiX: 0.92, rasiY: 0.15 },
  { house: 12, planetCx: 0.75, planetCy: 0.12, rasiX: 0.92, rasiY: 0.06 },
];

const KundaliChart = ({ planetDetails, chartTheme = 'gold' }) => {
  const S = CHART_SIZE;
  const strokeColor = chartTheme === 'gold' ? '#D4AF37' : '#FFFFFF';
  const bgColor = chartTheme === 'gold' ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255,255,255,0.05)';
  
  // Group planets by house
  const houseData = {};
  HouseRegions.forEach(hr => {
    houseData[hr.house] = { planets: [], rasi_no: null };
  });

  if (planetDetails) {
    // Attempt to parse planetDetails which might be an object like { "0": {...}, "1": {...} }
    const planetsArray = Array.isArray(planetDetails) 
      ? planetDetails 
      : Object.values(planetDetails).filter(p => typeof p === 'object' && p.name);

    planetsArray.forEach(p => {
      if (p && p.house && houseData[p.house]) {
        houseData[p.house].planets.push(p.name);
        if (!houseData[p.house].rasi_no) {
          houseData[p.house].rasi_no = p.rasi_no;
        }
      }
    });
  }

  // Also deduce the Rasi numbers for each house if missing, assuming continuous from Ascendant
  // If we know House 1's rasi, we can just do a loop 1-12
  let ascendantRasi = houseData[1]?.rasi_no;
  if (!ascendantRasi) {
    // Try to find the ascendant object
    const pArr = Array.isArray(planetDetails) ? planetDetails : Object.values(planetDetails || {});
    const asc = pArr.find(p => p && p.name === 'As' || p.full_name === 'Ascendant');
    if (asc) ascendantRasi = asc.rasi_no;
  }

  if (ascendantRasi) {
    for (let i = 1; i <= 12; i++) {
        const expectedRasi = ((ascendantRasi + i - 2) % 12) + 1;
        houseData[i].rasi_no = expectedRasi;
    }
  }

  return (
    <View style={[styles.container, { width: S, height: S }]}>
      <Svg width={S} height={S}>
        {/* Outer Square Background */}
        <Rect x={0} y={0} width={S} height={S} fill={bgColor} stroke={strokeColor} strokeWidth={2} />
        
        {/* Diagonals */}
        <Line x1={0} y1={0} x2={S} y2={S} stroke={strokeColor} strokeWidth={1} />
        <Line x1={S} y1={0} x2={0} y2={S} stroke={strokeColor} strokeWidth={1} />
        
        {/* Inner Diamond */}
        <Line x1={S/2} y1={0} x2={S} y2={S/2} stroke={strokeColor} strokeWidth={1} />
        <Line x1={S} y1={S/2} x2={S/2} y2={S} stroke={strokeColor} strokeWidth={1} />
        <Line x1={S/2} y1={S} x2={0} y2={S/2} stroke={strokeColor} strokeWidth={1} />
        <Line x1={0} y1={S/2} x2={S/2} y2={0} stroke={strokeColor} strokeWidth={1} />
      </Svg>

      {/* Render Text Overlays via Absolute Position */}
      {HouseRegions.map(region => {
        const { house, planetCx, planetCy, rasiX, rasiY } = region;
        const data = houseData[house];
        const planetString = (data.planets || []).join(', ');
        const rasiNumber = data.rasi_no || '';

        return (
          <View key={`house-${house}`} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Rasi Number */}
            <View 
              style={{
                position: 'absolute',
                left: rasiX * S - 15,
                top: rasiY * S - 10,
                width: 30,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={[styles.rasiText, { color: strokeColor }]}>{rasiNumber}</Text>
            </View>

            {/* Planets */}
            <View 
              style={{
                position: 'absolute',
                left: planetCx * S - 30,
                top: planetCy * S - 15,
                width: 60,
                height: 30,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={styles.planetText} numberOfLines={2}>
                {planetString}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: 20,
    backgroundColor: '#0a0a0a', // very dark to make pop
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  rasiText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.8,
  },
  planetText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 14,
  }
});

export default KundaliChart;
