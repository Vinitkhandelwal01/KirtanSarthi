import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { eventAPI, profileAPI } from "../services/api";
import LocationHeader from "../components/events/LocationHeader";
import FiltersBar from "../components/events/FiltersBar";
import EventCard from "../components/events/EventCard";
import useLang from "../hooks/useLang";
import useAuth from "../hooks/useAuth";

const SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => index);
const MAX_ACCEPTABLE_GEO_ACCURACY_METERS = 5000;

const getGeoPermissionState = async () => {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status?.state || "unknown";
  } catch {
    return "unknown";
  }
};

const noop = () => {};

function EventSkeletonCard() {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          height: 140,
          background: "linear-gradient(135deg, rgba(92,58,30,.18), rgba(196,77,0,.18))",
        }}
      />
      <div style={{ padding: "1.2rem", display: "grid", gap: 10 }}>
        <div style={{ height: 16, background: "var(--cream-dark)", borderRadius: 999 }} />
        <div
          style={{
            height: 12,
            width: "70%",
            background: "var(--cream-dark)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            height: 12,
            width: "60%",
            background: "var(--cream-dark)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            height: 12,
            width: "48%",
            background: "var(--cream-dark)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            height: 38,
            marginTop: 8,
            background: "var(--cream-dark)",
            borderRadius: 12,
          }}
        />
      </div>
    </div>
  );
}

export default function NearbyEvents() {
  const { t } = useLang();
  const { user } = useSelector((state) => state.auth);
  const { updateUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDistance, setShowDistance] = useState(false);
  const [godFilter, setGodFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const activeGeoRequestIdRef = useRef(0);
  const userCityRef = useRef(user?.city || "");
  const userLocationRef = useRef(user?.location || null);

  useEffect(() => {
    userCityRef.current = user?.city || "";
  }, [user?.city]);

  useEffect(() => {
    userLocationRef.current = user?.location || null;
  }, [user?.location]);

  // FIX: Keep a ref to the latest updateUser so fetchNearbyEvents does not
  // need it in its dependency array. Without this, every render that produces
  // a new updateUser reference would recreate fetchNearbyEvents, which would
  // in turn trigger the useEffect again — causing repeated API calls.
  const updateUserRef = useRef(updateUser);
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  const lastLocationSyncRef = useRef("");

  const requestNearbyEvents = useCallback(async (params, mode = "unknown") => {
    void mode;
    const res = await eventAPI.getNearby(params);
    setEvents(res.events || []);
    return res;
  }, []);

  const fetchNearbyEvents = useCallback(
    async ({ forceRefresh = false } = {}) => {
      const requestId = ++activeGeoRequestIdRef.current;
      const isStale = () => requestId !== activeGeoRequestIdRef.current;

      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const finish = () => {
        if (isStale()) return;
        setLoading(false);
        setRefreshing(false);
      };
      const fallbackParams = userCityRef.current ? { city: userCityRef.current } : {};
      await getGeoPermissionState();

      if (isStale()) return;

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        try {
          if (isStale()) return;
          setShowDistance(false);
          await requestNearbyEvents(fallbackParams, "fallback:no_geolocation_api");
        } catch {
          if (isStale()) return;
          setEvents([]);
        } finally {
          if (isStale()) return;
          toast.error(t("allow_location_message"));
          finish();
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        // ─── GPS SUCCESS ────────────────────────────────────────────────────
        // FIX: Always use the fresh browser coords here. Previously,
        // savedCoordsRef was read before getCurrentPosition resolved, so stale
        // profile coords (e.g. Jaipur) could silently override the real GPS
        // position when the refs were accessed inside the callback.
        async (position) => {
          try {
            if (isStale()) return;
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            const hasLowAccuracy =
              Number.isFinite(accuracy) && accuracy > MAX_ACCEPTABLE_GEO_ACCURACY_METERS;
            const locationKey = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
            if (hasLowAccuracy) {
              // Use live coords even if coarse, but avoid syncing them to profile.
              // This prevents null/fallback requests when desktop geolocation is imprecise.
              setShowDistance(false);
              toast(t("location_check_failed_message"), { icon: "📍" });
              await requestNearbyEvents({ lat, lng }, "geo:low_accuracy");
              return;
            }

            // Sync the new live position back to the user profile, but only
            // when the location has actually changed to avoid chatty updates.
            if (lastLocationSyncRef.current !== locationKey) {
              try {
                if (isStale()) return;
                await profileAPI.updateLocation({ lat, lng, accuracy });
                // Use the ref so this call never appears in the dep array.
                updateUserRef.current({
                  location: {
                    type: "Point",
                    coordinates: [lng, lat],
                  },
                });
                lastLocationSyncRef.current = locationKey;
              } catch {
                // Profile sync failure is non-critical; continue with the fetch.
              }
            }

            if (isStale()) return;
            setShowDistance(true);
            await requestNearbyEvents({ lat, lng }, "geo");
          } catch (err) {
            if (isStale()) return;
            toast.error(err.message || t("failed_to_load_nearby_events"));
            setEvents([]);
          } finally {
            finish();
          }
        },

        // ─── GPS ERROR / DENIED ─────────────────────────────────────────────
        async (error) => {
          try {
            if (isStale()) return;
            setShowDistance(false);
            noop(error);

            if (forceRefresh) {
              if (error?.code === 1) {
                toast(t("allow_location_message"), { icon: "📍" });
              } else {
                toast(t("location_check_failed_message"), { icon: "📍" });
              }
            }

            await requestNearbyEvents(fallbackParams, "fallback:geo_error");
          } catch (err) {
            if (isStale()) return;
            toast.error(err.message || t("failed_to_load_nearby_events"));
            setEvents([]);
          } finally {
            finish();
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    },
    // FIX: updateUser removed from deps — we access it via updateUserRef
    // instead. This prevents the callback from being recreated every time
    // updateUser changes identity, which was the cause of the repeated fetches.
    [requestNearbyEvents, t]
  );

  useEffect(() => {
    fetchNearbyEvents();
  }, [fetchNearbyEvents]);

  useEffect(() => {
    if (!user?._id) return;
    fetchNearbyEvents({ forceRefresh: true });
  }, [fetchNearbyEvents, user?._id]);

  const filteredEvents = useMemo(() => {
    const next = events.filter((event) => {
      const godMatches = godFilter ? event.god === godFilter : true;
      const typeMatches = eventTypeFilter ? event.eventType === eventTypeFilter : true;
      return godMatches && typeMatches;
    });

    next.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.dateTime) - new Date(b.dateTime);
      }

      const aDistance = a.distance ?? Number.MAX_SAFE_INTEGER;
      const bDistance = b.distance ?? Number.MAX_SAFE_INTEGER;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return new Date(a.dateTime) - new Date(b.dateTime);
    });

    return next;
  }, [eventTypeFilter, events, godFilter, sortBy]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("nearby_events_title")}</h1>
          <p>{t("nearby_events_subtitle")}</p>
        </div>
      </div>

      <div className="main-content">
        <LocationHeader
          loading={loading}
          onRefresh={() => fetchNearbyEvents({ forceRefresh: true })}
          refreshing={refreshing}
        />

        <FiltersBar
          god={godFilter}
          eventType={eventTypeFilter}
          sortBy={sortBy}
          onGodChange={setGodFilter}
          onEventTypeChange={setEventTypeFilter}
          onSortChange={setSortBy}
        />

        {loading ? (
          <div className="grid-3">
            {SKELETON_ITEMS.map((item) => (
              <EventSkeletonCard key={item} />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">📍</span>
            <h3>{t("no_nearby_events")}</h3>
            <p style={{ color: "var(--text-muted)", marginTop: ".4rem" }}>
              {t("no_nearby_events_help")}
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredEvents.map((event) => (
              <EventCard key={event._id} event={event} showDistance={showDistance} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
