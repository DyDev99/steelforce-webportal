'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { adminSessionsRepository, type AdminSession } from '@/features/sessions';
import { useLiveTracking } from '@/features/visits-management';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Smartphone,
  Laptop,
  Search,
  MapPin,
  Map as MapIcon,
  Filter,
  Clock,
  WifiOff,
  Wifi,
  PowerOff,
  AlertTriangle,
  User,
  ShieldCheck,
  Server,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  loadGoogleMaps,
  LIGHT_MAP_STYLE,
  devicePinIcon,
  deviceMarkerKind,
  DEVICE_PIN_SIZE,
} from '@/features/planning/lib/google-maps';


export default function SessionsAndDevicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The fleet view. Aborts on unmount so a fast navigation cannot land a stale
  // response on an unmounted component.
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await adminSessionsRepository.list({ pageSize: 100 }, signal);
      setSessions(page.items);
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return;
      setLoadError('Could not load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleRevoke = async (id: string) => {
    // Optimistic: the row goes immediately, and comes back if the call fails.
    // Revocation is not instant server-side - the device is locked out within the
    // access token's remaining lifetime, at most 15 minutes.
    const previous = sessions;
    setSessions(prev => prev.filter(s => s.id !== id));
    try {
      await adminSessionsRepository.revoke(id);
    } catch {
      setSessions(previous);
      setLoadError('Could not revoke that session.');
    }
  };

  // Live field positions, pushed from mobile telemetry over SignalR. Requires
  // `visits.readall`; without it the hook simply never connects and the board falls
  // back to whatever the REST call returned.
  const { positions: livePositions, isConnected: liveConnected } = useLiveTracking();

  // Telemetry is keyed to a *person*, the board lists *sessions*. So a live fix is
  // applied as a freshness overlay rather than a replacement: it wins only when it is
  // genuinely newer than the position the session already reported for itself.
  // Without that rule, a rep's own sign-in fix — which is per device and therefore
  // more specific — would be overwritten by a shared, older one.
  const live = useMemo(() => sessions.map(session => {
    const pushed = livePositions[session.repId];
    if (!pushed) return session;

    const current = session.location?.capturedAt;
    if (current && Date.parse(current) >= Date.parse(pushed.capturedAt)) return session;

    return {
      ...session,
      location: {
        lat: pushed.lat,
        lng: pushed.lng,
        label: session.location?.label ?? null,
        capturedAt: pushed.capturedAt,
      },
    };
  }), [sessions, livePositions]);

  const filtered = live.filter(s =>
    s.repName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.device.model ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onlineCount = live.filter(s => s.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Smartphone className="text-blue-600" /> Sessions & Devices
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-gray-500">
            Monitor active field devices, track locations, and revoke access remotely.
          </p>
          {/* Says whether the telemetry socket is actually up. Without this, a board
              with no pins looks identical whether the hub is down, the permission is
              missing, or the handsets simply have not moved. */}
          <span
            title={
              liveConnected
                ? 'Receiving live positions from the field-tracking hub.'
                : 'Not connected. Live positions need the visits.readall permission and a reachable hub.'
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
              liveConnected
                ? 'border-green-500/25 bg-green-500/10 text-green-700'
                : 'border-slate-500/25 bg-slate-500/10 text-slate-600'
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {liveConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  liveConnected ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
            </span>
            {liveConnected ? 'Live tracking on' : 'Live tracking off'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-gray-100 card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '0ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Server size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Total Active Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
        </Card>

        <Card className="p-5 border-gray-100 card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <Wifi size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Online Devices</p>
          <p className="text-3xl font-bold text-gray-900">{onlineCount}</p>
        </Card>

        <Card className="p-5 border-gray-100 card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in-up opacity-0" style={{ borderRadius: '18px', animationFillMode: 'forwards', animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Security Status</p>
          <p className="text-xl font-bold text-gray-900 mt-2 text-green-600">Secure</p>
        </Card>
      </div>

      {/* Map Card */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3 }}
          >
            {isEnlarged && (
              <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setIsEnlarged(false)} />
            )}
            <Card className={`border-surface card-shadow overflow-hidden transition-all duration-300 ${isEnlarged ? 'fixed inset-4 md:inset-8 z-50 rounded-2xl' : 'relative mb-6 rounded-card h-[350px]'}`}>
              <div className="h-full w-full" id="sessions-map-container" />
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-4 right-4 z-10 shadow-sm bg-white/90 hover:bg-white backdrop-blur text-xs h-8"
                onClick={() => setIsEnlarged(!isEnlarged)}
              >
                {isEnlarged ? (
                  <><Minimize2 size={14} className="mr-1.5 text-gray-500" /> Minimize</>
                ) : (
                  <><Maximize2 size={14} className="mr-1.5 text-gray-500" /> Enlarge</>
                )}
              </Button>
            </Card>
            <SessionsMap sessions={live} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table Card */}
      <Card className="border-surface card-shadow rounded-card overflow-hidden animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '150ms' }}>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rep or device..." 
                className="pl-9 bg-gray-50/50 border-gray-200 rounded-xl h-10 text-sm focus-visible:ring-primary/20"
              />
            </div>
            <Button 
              variant={showMap ? "default" : "outline"}
              className="h-10 rounded-xl px-4 text-[13px]"
              onClick={() => setShowMap(!showMap)}
            >
              <MapIcon size={16} className="mr-2" />
              {showMap ? 'Hide Map' : 'Preview Map'}
            </Button>
            <Button variant="outline" className="h-10 rounded-xl px-4 text-[13px]">
              <Filter size={16} className="mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="p-4 font-semibold">Sales Rep</th>
                <th className="p-4 font-semibold">Device</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      No sessions found.
                    </td>
                  </tr>
                )}
                {filtered.map((session, i) => (
                  <motion.tr 
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                          {session.repName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{session.repName}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{session.repId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        {session.device.type === 'mobile' ? (
                          <Smartphone size={16} className="text-gray-400 mt-0.5" />
                        ) : (
                          <Laptop size={16} className="text-gray-400 mt-0.5" />
                        )}
                        <div>
                          <p className="text-[13px] font-semibold text-gray-800">{session.device.model}</p>
                          <p className="text-[11px] text-gray-500">
                            {session.device.os} • App v{session.device.appVersion}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                        {/* Null until the handset has pushed telemetry at least
                            once. Saying so beats a pin in the Gulf of Guinea. */}
                        {session.location ? (
                          <div>
                            <p className="text-[13px] font-medium text-gray-800">
                              {session.location.label ?? '—'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {session.location.lat.toFixed(4)}, {session.location.lng.toFixed(4)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[13px] text-gray-400">No location reported</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {session.status === 'online' ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <span className="text-[12px] font-semibold">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <WifiOff size={12} />
                          <span className="text-[12px] font-medium">Offline</span>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {session.status === 'online' ? 'Active now' : format(new Date(session.lastActive), 'MMM d, h:mm a')}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(session.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <PowerOff size={14} className="mr-1.5" /> Revoke
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SessionsMap({ sessions }: { sessions: AdminSession[] }) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    let active = true;
    loadGoogleMaps().then((google) => {
      if (!active) return;
      const el = document.getElementById('sessions-map-container');
      if (!el) return;
      
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(el, {
          center: { lat: 12.5657, lng: 104.9910 }, // Cambodia center
          zoom: 7,
          disableDefaultUI: true,
          styles: LIGHT_MAP_STYLE,
        });
      }
      
      // Clear old markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      // Add new markers
      sessions.filter(session => session.location).forEach(session => {
        // Sustainable Green when the session is live, Slate when it is not.
        const color = session.status === 'online' ? '#2C9942' : '#7D8BA0';
        const kind = deviceMarkerKind(session.device.type, session.device.os);

        // Standard Marker rather than AdvancedMarkerElement, which needs a Map ID.
        const marker = new google.maps.Marker({
          position: session.location,
          map: mapRef.current,
          icon: {
            url: devicePinIcon(kind, color),
            // The pin points at the coordinate from its tip, so the anchor is the
            // bottom centre. Anchoring at the centre would place every device half a
            // pin north of where it actually is.
            scaledSize: new google.maps.Size(DEVICE_PIN_SIZE.width, DEVICE_PIN_SIZE.height),
            anchor: new google.maps.Point(DEVICE_PIN_SIZE.width / 2, DEVICE_PIN_SIZE.height),
          },
          // Live devices sit above dormant ones where pins overlap.
          zIndex: session.status === 'online' ? 2 : 1,
          title: `${session.repName} — ${session.device.model ?? 'Unknown device'}`,
        });

        const capturedAt = session.location?.capturedAt
          ? new Date(session.location.capturedAt).toLocaleString()
          : null;

        const info = new google.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-family:sans-serif;">
            <div style="font-weight:bold;font-size:12px;color:#12233D;">${session.repName}</div>
            <div style="font-size:10px;color:#7D8BA0;margin-top:2px;">${session.device.model ?? 'Unknown device'} (${session.status})</div>
            ${capturedAt ? `<div style="font-size:10px;color:#ADBACA;margin-top:2px;">Fix taken ${capturedAt}</div>` : ''}
          </div>`,
          disableAutoPan: true
        });

        marker.addListener('mouseover', () => info.open(mapRef.current, marker));
        marker.addListener('mouseout', () => info.close());

        markersRef.current.push(marker);
      });
      
      // Fit bounds if we have sessions
      if (sessions.length > 0 && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        // Same filter as the markers: an unplotted session must not drag
        // the viewport to the Gulf of Guinea.
        const located = sessions.filter(s => s.location);
        if (located.length === 0) return;
        located.forEach(s => bounds.extend(s.location!));
        mapRef.current.fitBounds(bounds);
        // Prevent zooming in too far on single points
        const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
          if (mapRef.current.getZoom() > 14) mapRef.current.setZoom(14);
          google.maps.event.removeListener(listener);
        });
      }
    });
    
    return () => { active = false; };
  }, [sessions]);
  
  return null;
}
