import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { apiGet, apiPost, apiPostForm } from '../../lib/api';
import { User, Slot, AppointmentPriority } from '../../types';
import { colors } from '../../constants/theme';
import { FACULTIES, DEPARTMENTS_BY_FACULTY, DEGREE_PROGRAMS, REQUEST_TYPES } from '../../constants/faculties';
import SlotPicker from '../../components/appointment/SlotPicker';
import PrioritySelector from '../../components/appointment/PrioritySelector';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useSocket } from '../../hooks/useSocket';
import { Ionicons } from '@expo/vector-icons';

export default function BookSlot() {
  const { success, error, warning } = useToast();
  const [selectedLecturer, setSelectedLecturer] = React.useState<User | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null);

  // Cascading Form States
  const [faculty, setFaculty] = React.useState<string>('');
  const [department, setDepartment] = React.useState<string>('');
  const [degreeProgram, setDegreeProgram] = React.useState<string>('');
  const [requestType, setRequestType] = React.useState<string>('course-issue');
  const [title, setTitle] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [priority, setPriority] = React.useState<AppointmentPriority>('normal');
  const [uploadedDoc, setUploadedDoc] = React.useState<{ uri: string; name: string; size: number } | null>(null);
  const [bookingInProgress, setBookingInProgress] = React.useState(false);

  // Query Lecturers
  const { data: usersList = [], isLoading: loadingLecturers } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<User[]>('/api/users'),
  });

  const lecturers = React.useMemo(() => {
    return usersList.filter((u: User) => u.role === 'lecturer');
  }, [usersList]);

  // Query Available Slots
  const { data: slots = [], isLoading: loadingSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['slots', selectedLecturer?._id, selectedDate],
    queryFn: () => {
      if (!selectedLecturer) return [];
      return apiGet<Slot[]>(`/api/availability/${selectedLecturer._id}?date=${selectedDate}`);
    },
    enabled: !!selectedLecturer,
  });

  useSocket('slot:updated', (data) => {
    if (selectedLecturer?._id === data.lecturerId && (data.date === 'dynamic' || selectedDate === data.date)) {
      refetchSlots();
    }
  });

  const departmentOptions = faculty ? DEPARTMENTS_BY_FACULTY[faculty as any] || [] : [];
  const degreeOptions = (faculty && department)
    ? DEGREE_PROGRAMS[`${faculty}|${department}`] || []
    : [];

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setUploadedDoc({
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
        });
        success('Document Attached', `${file.name} attached successfully.`);
      }
    } catch (e) {
      error('Upload Failed', 'Failed to pick document.');
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return warning('Slot Missing', 'Please select a time slot.');
    if (!faculty) return warning('Faculty Missing', 'Please select a Faculty.');
    if (departmentOptions.length > 0 && !department) return warning('Department Missing', 'Please select a Department.');
    if (degreeOptions.length > 0 && !degreeProgram) return warning('Degree Program Missing', 'Please select a Degree Program.');
    if (!title.trim()) return warning('Title Missing', 'Please enter a request title.');
    if (!reason.trim()) return warning('Description Missing', 'Please enter a description.');

    if (priority === 'emergency' && !uploadedDoc) {
      return error('Document Required', 'Emergency requests require supporting documents.');
    }

    setBookingInProgress(true);
    try {
      let fileData: any = null;

      if (uploadedDoc) {
        const formData = new FormData();
        formData.append('file', {
          uri: uploadedDoc.uri,
          name: uploadedDoc.name,
          type: uploadedDoc.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        } as any);

        const uploadResult = await apiPostForm<{ fileUrl: string; fileName: string }>('/api/upload', formData);
        fileData = {
          fileUrl: uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileSizeMb: Number((uploadedDoc.size / (1024 * 1024)).toFixed(2)),
        };
      }

      // JSON reason string containing academic cascading properties
      const fullReasonJson = JSON.stringify({
        title,
        description: reason,
        faculty,
        department,
        degreeProgram,
        requestType,
      });

      // Submit academic request first
      const requestRes = await apiPost<any>('/api/academic-requests', {
        faculty,
        department,
        degreeProgram,
        requestType,
        title,
        description: reason,
        priority,
      });

      // Book appointment slot
      await apiPost('/api/appointments', {
        lecturerId: selectedLecturer?._id,
        requestedStart: selectedSlot.start,
        requestedEnd: selectedSlot.end,
        priority,
        reason: fullReasonJson,
        documents: fileData ? [fileData] : [],
        requestId: requestRes._id,
      });

      success('Success!', 'Your slot booking request has been submitted.');
      
      // Reset form states
      setSelectedSlot(null);
      setFaculty('');
      setDepartment('');
      setDegreeProgram('');
      setTitle('');
      setReason('');
      setUploadedDoc(null);
      setPriority('normal');
      refetchSlots();
    } catch (err: any) {
      error('Booking Failed', err.response?.data?.error || 'An error occurred during booking.');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 py-4" showsVerticalScrollIndicator={false}>
      <Text className="text-xl font-black text-gray-900 mb-4">Book an Appointment</Text>

      {/* Lecturer Selector */}
      <View className="bg-white p-4 rounded-3xl border border-gray-100 mb-4">
        <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          Select Lecturer
        </Text>
        {loadingLecturers ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {lecturers.map((lec) => {
              const isSelected = selectedLecturer?._id === lec._id;
              return (
                <TouchableOpacity
                  key={lec._id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedLecturer(lec);
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-3 rounded-2xl border mr-2 items-center ${
                    isSelected ? 'bg-vau-maroon border-transparent' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                    {lec.name}
                  </Text>
                  <Text className={`text-[8px] font-bold mt-0.5 uppercase tracking-wider ${
                    isSelected ? 'text-white/80' : 'text-gray-400'
                  }`}>
                    {lec.department || 'Staff'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Slots List */}
      {selectedLecturer ? (
        <View className="mb-4">
          <SlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            loading={loadingSlots}
          />
        </View>
      ) : null}

      {/* Cascading Request Form */}
      {selectedSlot ? (
        <View className="gap-4 mb-10">
          <View className="bg-white p-5 rounded-3xl border border-gray-100 gap-4">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
              Academic Details
            </Text>

            {/* Faculty Dropdown */}
            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Faculty</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {FACULTIES.map((fac) => (
                  <TouchableOpacity
                    key={fac}
                    onPress={() => {
                      setFaculty(fac);
                      setDepartment('');
                      setDegreeProgram('');
                    }}
                    className={`px-3 py-2 rounded-xl border mr-2 ${
                      faculty === fac ? 'bg-vau-maroon border-transparent' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${faculty === fac ? 'text-white' : 'text-gray-700'}`}>
                      {fac}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Department Dropdown */}
            {faculty && departmentOptions.length > 0 ? (
              <View className="gap-1.5">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {departmentOptions.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      onPress={() => {
                        setDepartment(dept);
                        setDegreeProgram('');
                      }}
                      className={`px-3 py-2 rounded-xl border mr-2 ${
                        department === dept ? 'bg-vau-maroon border-transparent' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${department === dept ? 'text-white' : 'text-gray-700'}`}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Degree Program Dropdown */}
            {department && degreeOptions.length > 0 ? (
              <View className="gap-1.5">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Degree Program</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {degreeOptions.map((deg) => (
                    <TouchableOpacity
                      key={deg}
                      onPress={() => setDegreeProgram(deg)}
                      className={`px-3 py-2 rounded-xl border mr-2 ${
                        degreeProgram === deg ? 'bg-vau-maroon border-transparent' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${degreeProgram === deg ? 'text-white' : 'text-gray-700'}`}>
                        {deg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Request Type Selector */}
            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Request Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {REQUEST_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setRequestType(t.value)}
                    className={`px-3 py-2 rounded-xl border mr-2 ${
                      requestType === t.value ? 'bg-vau-maroon border-transparent' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${requestType === t.value ? 'text-white' : 'text-gray-700'}`}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Inputs */}
            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Request Title</Text>
              <TextInput
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-800 font-bold text-sm"
                placeholder="e.g. Inquiries on End Semester Schedule"
                placeholderTextColor="#9CA3AF"
                onChangeText={setTitle}
                value={title}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description / Reason</Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-gray-800 font-bold text-sm min-h-[100px] textAlignVertical-top"
                placeholder="Briefly state your concern..."
                placeholderTextColor="#9CA3AF"
                onChangeText={setReason}
                value={reason}
              />
            </View>
          </View>

          {/* Priority selector */}
          <PrioritySelector value={priority} onChange={setPriority} />

          {/* Document Attachment Picker */}
          <View className="bg-white p-5 rounded-3xl border border-gray-100 gap-4">
            <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
              Attachments (Optional)
            </Text>
            {uploadedDoc ? (
              <View className="flex-row items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                  <Text className="text-xs text-gray-750 font-bold ml-2 truncate flex-1">
                    {uploadedDoc.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setUploadedDoc(null)} className="p-1">
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickDocument}
                className="border-2 border-dashed border-gray-300 rounded-2xl py-6 items-center justify-center bg-gray-50"
              >
                <Ionicons name="cloud-upload-outline" size={28} color={colors.text.muted} />
                <Text className="text-xs font-bold text-gray-500 mt-2">Pick PDF or Image</Text>
                <Text className="text-[9px] text-gray-400 font-medium mt-0.5">Supports PDF up to 10MB</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Book Submission */}
          <Button
            label="Book Appointment"
            onPress={handleBook}
            loading={bookingInProgress}
            style={{ marginBottom: 40 }}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
