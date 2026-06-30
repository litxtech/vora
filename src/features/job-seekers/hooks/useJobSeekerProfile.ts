import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  fetchMyJobSeekerProfile,
  setJobSeekerVisibility,
  updateJobSeekerDetails,
  upsertJobSeekerProfile,
  type JobSeekerProfile,
} from '@/features/job-seekers/services/seekerData';
import type { JobType, MilitaryStatus } from '@/features/personnel-center/types';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useJobSeekerProfile(user: { id: string } | null | undefined, profile: Profile | null) {
  const [seeker, setSeeker] = useState<JobSeekerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [intro, setIntro] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState('');
  const [drivingLicense, setDrivingLicense] = useState(false);
  const [militaryStatus, setMilitaryStatus] = useState<MilitaryStatus | null>(null);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSeeker(null);
      return;
    }

    setLoading(true);
    fetchMyJobSeekerProfile(user.id)
      .then((data) => {
        setSeeker(data);
        if (data) {
          setOccupation(data.occupation);
          setExperienceYears(String(data.experienceYears));
          setPhoneVisible(data.phoneVisible);
          setIntro(data.intro ?? '');
          setSkills(data.skills);
          setJobTypes(data.jobTypes);
          setEducation(data.education ?? '');
          setLanguages(data.languages.join(', '));
          setDrivingLicense(data.drivingLicense);
          setMilitaryStatus(data.militaryStatus);
          setSalaryExpectation(data.salaryExpectation ?? '');
          setIsReady(data.isReady);
        } else if (profile?.occupation) {
          setOccupation(profile.occupation);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id, profile?.occupation]);

  const isVisibleOnMap = seeker?.isVisibleOnMap ?? false;
  const hasProfile = seeker != null;

  const buildTitle = useCallback(
    (occ: string, years: number) => `${occ}${years > 0 ? ` — ${years} yıl` : ''}`,
    [],
  );

  const buildDetailsPayload = useCallback(() => {
    const years = Math.max(0, Number.parseInt(experienceYears, 10) || 0);
    const occ = occupation.trim();
    return {
      occupation: occ || undefined,
      experienceYears: years,
      phoneVisible,
      title: occ ? buildTitle(occ, years) : undefined,
      intro: intro.trim() || undefined,
      skills,
      jobTypes,
      education: education.trim() || undefined,
      languages: languages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      drivingLicense,
      militaryStatus,
      salaryExpectation: salaryExpectation.trim() || undefined,
      isReady,
    };
  }, [
    occupation,
    experienceYears,
    phoneVisible,
    intro,
    skills,
    jobTypes,
    education,
    languages,
    drivingLicense,
    militaryStatus,
    salaryExpectation,
    isReady,
    buildTitle,
  ]);

  const saveProfile = useCallback(async () => {
    if (!user?.id || !profile) return { error: 'Profil bilgisi eksik' };

    const occ = occupation.trim();
    if (!occ) return { error: 'Meslek bilgisi gerekli.' };

    const regionId = profile.region_id ?? 'trabzon';
    const years = Math.max(0, Number.parseInt(experienceYears, 10) || 0);
    const title = buildTitle(occ, years);
    const details = buildDetailsPayload();

    setSaving(true);
    const result = await upsertJobSeekerProfile({
      userId: user.id,
      regionId,
      title,
      occupation: occ,
      experienceYears: years,
      intro: details.intro,
      skills: details.skills,
      jobTypes: details.jobTypes,
      education: details.education,
      languages: details.languages,
      drivingLicense: details.drivingLicense,
      militaryStatus: details.militaryStatus,
      salaryExpectation: details.salaryExpectation,
      isReady: details.isReady,
      district: profile.district ?? undefined,
      phoneVisible,
      isVisibleOnMap: seeker?.isVisibleOnMap ?? false,
    });

    if (!result.error) {
      setSeeker({
        id: seeker?.id ?? 'local',
        title,
        occupation: occ,
        experienceYears: years,
        isVisibleOnMap: seeker?.isVisibleOnMap ?? false,
        phoneVisible,
        intro: details.intro ?? null,
        skills: details.skills ?? [],
        jobTypes: details.jobTypes ?? [],
        education: details.education ?? null,
        languages: details.languages ?? [],
        drivingLicense: details.drivingLicense ?? false,
        militaryStatus: details.militaryStatus ?? null,
        salaryExpectation: details.salaryExpectation ?? null,
        isReady: details.isReady ?? false,
      });
    }
    setSaving(false);
    return result;
  }, [user?.id, profile, occupation, experienceYears, phoneVisible, seeker, buildTitle, buildDetailsPayload]);

  const disableMapVisibility = useCallback(async () => {
    if (!user?.id) return { error: 'Oturum bulunamadı' };
    setSaving(true);
    const result = await setJobSeekerVisibility(user.id, false);
    if (!result.error) {
      setSeeker((prev) => (prev ? { ...prev, isVisibleOnMap: false } : prev));
    }
    setSaving(false);
    return result;
  }, [user?.id]);

  const enableMapVisibility = useCallback(async () => {
    if (!user?.id || !profile) return { error: 'Profil bilgisi eksik' };

    const occ = occupation.trim();
    if (!occ) return { error: 'Önce meslek bilginizi kaydedin.' };

    const regionId = profile.region_id ?? 'trabzon';
    const years = Math.max(0, Number.parseInt(experienceYears, 10) || 0);
    const title = buildTitle(occ, years);

    let latitude: number | undefined;
    let longitude: number | undefined;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    }

    setSaving(true);
    const details = buildDetailsPayload();
    const result = await upsertJobSeekerProfile({
      userId: user.id,
      regionId,
      title,
      occupation: occ,
      experienceYears: years,
      intro: details.intro,
      skills: details.skills,
      jobTypes: details.jobTypes,
      education: details.education,
      languages: details.languages,
      drivingLicense: details.drivingLicense,
      militaryStatus: details.militaryStatus,
      salaryExpectation: details.salaryExpectation,
      isReady: details.isReady,
      district: profile.district ?? undefined,
      latitude,
      longitude,
      phoneVisible,
      isVisibleOnMap: true,
    });

    if (!result.error) {
      setSeeker({
        id: seeker?.id ?? 'local',
        title,
        occupation: occ,
        experienceYears: years,
        isVisibleOnMap: true,
        phoneVisible,
        intro: details.intro ?? null,
        skills: details.skills ?? [],
        jobTypes: details.jobTypes ?? [],
        education: details.education ?? null,
        languages: details.languages ?? [],
        drivingLicense: details.drivingLicense ?? false,
        militaryStatus: details.militaryStatus ?? null,
        salaryExpectation: details.salaryExpectation ?? null,
        isReady: details.isReady ?? false,
      });
    }
    setSaving(false);
    return result;
  }, [user?.id, profile, occupation, experienceYears, phoneVisible, seeker?.id, buildTitle, buildDetailsPayload]);

  const toggleSkill = useCallback((skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }, []);

  const toggleJobType = useCallback((type: JobType) => {
    setJobTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }, []);

  return {
    seeker,
    loading,
    saving,
    hasProfile,
    isVisibleOnMap,
    occupation,
    setOccupation,
    experienceYears,
    setExperienceYears,
    phoneVisible,
    setPhoneVisible,
    intro,
    setIntro,
    skills,
    toggleSkill,
    jobTypes,
    toggleJobType,
    education,
    setEducation,
    languages,
    setLanguages,
    drivingLicense,
    setDrivingLicense,
    militaryStatus,
    setMilitaryStatus,
    salaryExpectation,
    setSalaryExpectation,
    isReady,
    setIsReady,
    saveProfile,
    enableMapVisibility,
    disableMapVisibility,
  };
}
