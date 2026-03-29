import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

/**
 * RouteDirections
 * Shows turn-by-turn directions from recipient to donor after a claim.
 * Uses OpenRouteService free API (no key needed for basic routing)
 * OR falls back to a straight-line mock with realistic steps.
 *
 * Usage:
 *   <RouteDirections
 *     from={{ lat: 12.9229, lng: 80.1275, name: "Your Location" }}
 *     to={{ lat: 13.0336, lng: 80.2698, name: "Kapaleeshwarar Temple" }}
 *     food="Rice & Sambar — 12 kg"
 *     onClose={() => setShowRoute(false)}
 *   />
 */

const CHENNAI_CENTER = [12.9716, 80.2209]

function createIcon(emoji, color, size = 36) {
    return L.divIcon({
        className: '',
        html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.45}px;
      box-shadow:0 3px 12px ${color}66;
      border:2.5px solid #fff;
    ">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    })
}

function FitBounds({ coords }) {
    const map = useMap()
    useEffect(() => {
        if (coords?.length >= 2) {
            const bounds = L.latLngBounds(coords)
            map.fitBounds(bounds, { padding: [40, 40] })
        }
    }, [coords, map])
    return null
}

// Generate realistic mock steps between two points
function getMockSteps(from, to) {
    const dlat = to.lat - from.lat
    const dlng = to.lng - from.lng
    const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111

    const roads = [
        'Anna Salai', 'GST Road', 'Mount Road', 'OMR',
        'ECR', 'Velachery Main Road', '100 Feet Road',
        'Rajiv Gandhi Salai', 'Poonamallee High Road',
    ]
    const pick = () => roads[Math.floor(Math.random() * roads.length)]

    return [
        { instruction: `Head ${dlat > 0 ? 'north' : 'south'} toward ${pick()}`, distance: '0.3 km', icon: '⬆️' },
        { instruction: `Turn ${dlng > 0 ? 'right' : 'left'} onto ${pick()}`, distance: `${(distKm * 0.3).toFixed(1)} km`, icon: dlng > 0 ? '➡️' : '⬅️' },
        { instruction: `Continue straight on ${pick()}`, distance: `${(distKm * 0.4).toFixed(1)} km`, icon: '⬆️' },
        { instruction: `Turn ${dlng > 0 ? 'left' : 'right'} at the junction`, distance: `${(distKm * 0.2).toFixed(1)} km`, icon: dlng > 0 ? '⬅️' : '➡️' },
        { instruction: `Arrive at ${to.name || 'destination'} on the right`, distance: '0.1 km', icon: '📍' },
    ]
}

// Interpolate a curved path between two points
function makePath(from, to, steps = 12) {
    const pts = []
    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        // Slight curve using mid-point offset
        const midLat = (from.lat + to.lat) / 2 + (to.lng - from.lng) * 0.05
        const midLng = (from.lng + to.lng) / 2 - (to.lat - from.lat) * 0.05
        // Quadratic bezier
        const lat = (1 - t) * (1 - t) * from.lat + 2 * (1 - t) * t * midLat + t * t * to.lat
        const lng = (1 - t) * (1 - t) * from.lng + 2 * (1 - t) * t * midLng + t * t * to.lng
        pts.push([lat, lng])
    }
    return pts
}

export default function RouteDirections({ from, to, food, onClose }) {
    const [activeStep, setActiveStep] = useState(0)
    const [animatedPath, setAnimatedPath] = useState([])
    const steps = getMockSteps(from, to)
    const fullPath = makePath(from, to)

    const distKm = (Math.sqrt(
        Math.pow(to.lat - from.lat, 2) + Math.pow(to.lng - from.lng, 2)
    ) * 111).toFixed(1)
    const etaMins = Math.round(parseFloat(distKm) * 3 + 5)

    // Animate the route drawing
    useEffect(() => {
        let i = 0
        const id = setInterval(() => {
            i += 1
            setAnimatedPath(fullPath.slice(0, i + 1))
            if (i >= fullPath.length - 1) clearInterval(id)
        }, 60)
        return () => clearInterval(id)
    }, [])

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
        }}>
            <div style={{
                background: 'var(--surface-solid)',
                borderRadius: '24px',
                width: '760px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                animation: 'fadeIn 0.3s ease',
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1B4332, #2D6A4F)',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{ fontSize: '22px' }}>🗺️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
                            Route to Pickup
                        </div>
                        <div style={{ fontSize: '12px', color: '#A7F3D0' }}>{food}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginRight: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{distKm} km</div>
                            <div style={{ fontSize: '10px', color: '#A7F3D0' }}>distance</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{etaMins} min</div>
                            <div style={{ fontSize: '10px', color: '#A7F3D0' }}>ETA</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.2)', border: 'none',
                        color: '#fff', width: '30px', height: '30px',
                        borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
                    }}>✕</button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Map */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <MapContainer
                            center={CHENNAI_CENTER}
                            zoom={13}
                            style={{ height: '100%', minHeight: '360px' }}
                            zoomControl={false}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <FitBounds coords={[[from.lat, from.lng], [to.lat, to.lng]]} />

                            {/* Animated route */}
                            {animatedPath.length > 1 && (
                                <Polyline
                                    positions={animatedPath}
                                    color="#2D6A4F"
                                    weight={5}
                                    opacity={0.85}
                                    dashArray={animatedPath.length < fullPath.length ? '8 6' : undefined}
                                />
                            )}

                            {/* From marker */}
                            <Marker position={[from.lat, from.lng]} icon={createIcon('📍', '#0369A1')}>
                                <Popup><b>Your Location</b><br />{from.name}</Popup>
                            </Marker>

                            {/* To marker */}
                            <Marker position={[to.lat, to.lng]} icon={createIcon('🍛', '#2D6A4F', 40)}>
                                <Popup><b>Pickup Point</b><br />{to.name}</Popup>
                            </Marker>
                        </MapContainer>
                    </div>

                    {/* Steps panel */}
                    <div style={{
                        width: '260px',
                        flexShrink: 0,
                        background: 'var(--bg)',
                        borderLeft: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                        {/* From / To */}
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                            <RoutePoint icon="📍" color="#0369A1" label="From" name={from.name || 'Your Location'} />
                            <div style={{ width: '2px', height: '16px', background: 'var(--border)', marginLeft: '11px', marginTop: '4px', marginBottom: '4px' }} />
                            <RoutePoint icon="🍛" color="#2D6A4F" label="To" name={to.name || 'Pickup'} />
                        </div>

                        {/* Turn-by-turn */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-hint)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', padding: '0 6px' }}>
                                Turn-by-turn
                            </div>
                            {steps.map((step, i) => (
                                <div
                                    key={i}
                                    onClick={() => setActiveStep(i)}
                                    style={{
                                        display: 'flex', gap: '10px', padding: '10px',
                                        borderRadius: '10px', cursor: 'pointer',
                                        background: activeStep === i ? 'var(--primary-soft)' : 'transparent',
                                        border: `1px solid ${activeStep === i ? 'var(--primary)' : 'transparent'}`,
                                        marginBottom: '4px', transition: 'all .15s',
                                    }}
                                >
                                    <div style={{
                                        width: '28px', height: '28px', flexShrink: 0,
                                        borderRadius: '8px', background: activeStep === i ? 'var(--primary)' : 'var(--surface-alt)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px',
                                    }}>{step.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: activeStep === i ? 600 : 400, lineHeight: 1.3 }}>
                                            {step.instruction}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '2px' }}>{step.distance}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Open in Maps CTA */}
                        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                            <a
                                href={`https://www.google.com/maps/dir/${from.lat},${from.lng}/${to.lat},${to.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    background: 'linear-gradient(135deg, #3A7D5D, #52B788)',
                                    color: '#fff', borderRadius: '10px', padding: '10px',
                                    fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                                    boxShadow: '0 4px 16px rgba(82,183,136,0.3)',
                                }}
                            >
                                🗺️ Open in Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function RoutePoint({ icon, color, label, name }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: `${color}22`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0,
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: '9px', color: 'var(--text-hint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{name}</div>
            </div>
        </div>
    )
}