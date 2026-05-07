//use for newly registered artist , it restrict the access of request, performance ,etc page for newly artist before approved

import { useEffect, useState } from "react";
import { artistAPI } from "../services/api";
import useAuth from "./useAuth";

export default function useArtistApproval() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(user?.accountType === "ARTIST");
  const [hasProfile, setHasProfile] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user || user.accountType !== "ARTIST") {
      setLoading(false);
      setHasProfile(false);
      setIsApproved(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    artistAPI
      .getMe()
      .then((res) => {
        if (!active) return;
        const artist = res.artist || res;
        setHasProfile(true);
        setIsApproved(Boolean(artist?.isApproved));
      })
      .catch(() => {
        if (!active) return;
        setHasProfile(false);
        setIsApproved(false);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return { loading, hasProfile, isApproved };
}
