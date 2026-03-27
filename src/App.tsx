/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  LogOut, 
  LogIn, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Fuel, 
  User, 
  ChevronRight, 
  Trash2,
  TrendingUp,
  CreditCard,
  Banknote,
  MoreHorizontal,
  X,
  AlertCircle,
  Download,
  Pencil,
  Database,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout as firebaseLogout, 
  handleFirestoreError,
  OperationType 
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Toaster, toast } from 'sonner';

// --- Types ---

interface Trip {
  id: string;
  date: string;
  vehicleNumber: string;
  driverName?: string;
  driverMobile?: string;
  tons?: number;
  from: string;
  to: string;
  driverAdvance: number;
  dieselLiters: number;
  dieselAmount?: number;
  rent: number;
  paymentMode: 'Cash' | 'UPI' | 'Other';
  loadingCharge: number;
  unloadingCharge: number;
  localTax: number;
  pcCharge: number;
  otherExpense: number;
  otherExpense1: number;
  otherExpense2: number;
  otherExpense3: number;
  driverCharge: number;
  createdAt: any;
  uid: string;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  name: string;
  createdAt: any;
  uid: string;
}

// --- Constants ---

import { DESTINATIONS } from './constants';

const DEFAULT_FLEET = [
  "AP-39-UE-8447", "TN-18-BH-1222", "TN-19-T-2007", "TN-23-AC-3720", "TN-23-BA-9761",
  "TN-23-CA-7321", "TN-23-CC-3682", "TN-23-CC-5492", "TN-23-CD-9733", "TN-23-CH-9043",
  "TN-23-CK-3290", "TN-23-CL-9320", "TN-23-CM-7241", "TN-23-CR-0757", "TN-23-AD-1557",
  "TN-23-CU-1555", "TN-23-CU-7665", "TN-23-DB-5499", "TN-23-DB-7599", "TN-23-DB-7971",
  "TN-23-DB-9599", "TN-23-DD-2777", "TN-23-H-3605", "TN-28-BK-1119", "TN-28-BK-3949",
  "TN-28-BK-7779", "TN-28-BL-5779"
];

const DEFAULT_PLACES = [
  "ACC", "ADANI", "AMBUJA", "Arakkonam(L&T)", "BHARATHI", "BPCL", "BROKERLOAD", "CFL", 
  "CHETTINAD", "DALMIA", "FACT", "GD", "HPCL", "IFFCO", "IOCL", "IPL", "JSW", "KCP", 
  "KRIBHCO", "MANGALAM(PPL)", "MFL", "NFL", "RAMCO", "RELIANCE", "RH(L&T)", "ROCK", 
  "SPIC", "TANFEED", "TATA", "ULTRATECH", "VEDANTA", "ZUARI"
];

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      try {
        const parsed = JSON.parse(e.message);
        setError(parsed.error || 'An unexpected error occurred.');
      } catch {
        setError(e.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">பயன்பாட்டு பிழை</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            பயன்பாட்டை மீண்டும் ஏற்றவும்
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const DRIVERS = [
  { name: "SAKTHIVEL", mobile: "8072135378" },
  { name: "GANAVEL", mobile: "9894017678" },
  { name: "RAJKUMAR", mobile: "9080458597" },
  { name: "CHINADURAI", mobile: "9768128526" },
  { name: "LAXMAN", mobile: "9047379057" },
  { name: "MAHINDRAN", mobile: "9655385536" },
  { name: "MURUGAN", mobile: "9489804002" },
  { name: "VENKATESAN (1)", mobile: "9443139803" },
  { name: "AKTHER", mobile: "9597128526" },
  { name: "REDDY", mobile: "8270503344" },
  { name: "SHANMUGAM", mobile: "9677458181" },
  { name: "VENKATESAN (2)", mobile: "9150964377" },
  { name: "PARKESH", mobile: "9626059788" },
  { name: "GOVINDA SWAMI", mobile: "8870728541" },
  { name: "CHANDRAN", mobile: "9159239589" },
  { name: "DAYALAN", mobile: "8903751249" },
  { name: "KASI", mobile: "9087029118" },
  { name: "VETRI VEL", mobile: "8838651995" },
  { name: "MUNIYAN", mobile: "9566109864" },
  { name: "VIKRAM", mobile: "7339501817" },
  { name: "RADHA", mobile: "6382272413" },
  { name: "UDADYAKUMAR", mobile: "9629778784" },
  { name: "MANI", mobile: "8778983440" },
  { name: "JAI SHANKAR", mobile: "8883481330" },
  { name: "RAMESH", mobile: "9500835485" },
  { name: "ANBU", mobile: "9500689223" },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<'trips' | 'reports' | 'expenses'>('trips');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [formTons, setFormTons] = useState<string>("");
  const [formTo, setFormTo] = useState<string>("");
  const [formRent, setFormRent] = useState<string>("");

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (editingTrip) {
      setFormTons(editingTrip.tons?.toString() || "");
      setFormTo(editingTrip.to || "");
      setFormRent(editingTrip.rent?.toString() || "");
    } else {
      setFormTons("");
      setFormTo("");
      setFormRent("");
    }
  }, [editingTrip, isAddingTrip]);

  useEffect(() => {
    if (formTons && formTo) {
      const dest = DESTINATIONS.find(d => d.place === formTo);
      if (dest) {
        const calculatedRent = Number(formTons) * dest.pmt;
        setFormRent(calculatedRent.toFixed(2));
      }
    }
  }, [formTons, formTo]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error('உள்நுழைய முடியவில்லை');
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      toast.success('வெளியேறப்பட்டது');
    } catch (err) {
      toast.error('வெளியேற முடியவில்லை');
    }
  };

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) {
      setTrips([]);
      setVehicles([]);
      return;
    }

    const tripsQuery = query(
      collection(db, 'trips'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const vehiclesQuery = query(
      collection(db, 'vehicles'),
      where('uid', '==', user.uid)
    );

    const unsubTrips = onSnapshot(tripsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
      setTrips(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trips'));

    const unsubVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles'));

    return () => {
      unsubTrips();
      unsubVehicles();
    };
  }, [user]);

  const hasShownWelcome = React.useRef(false);
  useEffect(() => {
    if (user && isAuthReady && !hasShownWelcome.current) {
      toast.success(`மீண்டும் வருக, ${user.displayName}!`);
      hasShownWelcome.current = true;
    }
  }, [user, isAuthReady]);

  // --- Calculations ---
  const stats = useMemo(() => {
    const totalRent = trips.reduce((acc, t) => acc + t.rent, 0);
    const totalExpenses = trips.reduce((acc, t) => 
      acc + t.loadingCharge + t.unloadingCharge + t.localTax + t.pcCharge + t.otherExpense + t.driverCharge + (t.dieselAmount || 0), 0);
    const totalDiesel = trips.reduce((acc, t) => acc + t.dieselLiters, 0);
    const totalDieselAmount = trips.reduce((acc, t) => acc + (t.dieselAmount || 0), 0);
    const totalAdvance = trips.reduce((acc, t) => acc + t.driverAdvance, 0);
    const totalTons = trips.reduce((acc, t) => acc + (t.tons || 0), 0);
    
    return { 
      totalRent, 
      totalExpenses, 
      totalDiesel, 
      totalDieselAmount, 
      totalAdvance, 
      totalTons,
      netProfit: totalRent - totalExpenses - totalAdvance, 
      tripsCount: trips.length 
    };
  }, [trips]);

  const allVehicleNumbers = useMemo(() => {
    const customVehicles = vehicles.map(v => v.vehicleNumber);
    const combined = [...new Set([...DEFAULT_FLEET, ...customVehicles])];
    return combined.sort();
  }, [vehicles]);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchesSearch = t.from.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVehicle = filterVehicle === 'All' || t.vehicleNumber === filterVehicle;
      return matchesSearch && matchesVehicle;
    });
  }, [trips, searchTerm, filterVehicle]);

  const truckStats = useMemo(() => {
    const statsMap: Record<string, { trips: number; rent: number; expenses: number; diesel: number; dieselAmount: number; tons: number; profit: number; lastTrip: string | null }> = {};
    
    allVehicleNumbers.forEach(vNum => {
      statsMap[vNum] = { trips: 0, rent: 0, expenses: 0, diesel: 0, dieselAmount: 0, tons: 0, profit: 0, lastTrip: null };
    });

    trips.forEach(t => {
      if (!statsMap[t.vehicleNumber]) {
        statsMap[t.vehicleNumber] = { trips: 0, rent: 0, expenses: 0, diesel: 0, dieselAmount: 0, tons: 0, profit: 0, lastTrip: null };
      }
      const expenses = t.loadingCharge + t.unloadingCharge + t.localTax + t.pcCharge + t.otherExpense + t.driverCharge + t.driverAdvance + (t.dieselAmount || 0);
      statsMap[t.vehicleNumber].trips += 1;
      statsMap[t.vehicleNumber].rent += t.rent;
      statsMap[t.vehicleNumber].expenses += expenses;
      statsMap[t.vehicleNumber].diesel += t.dieselLiters;
      statsMap[t.vehicleNumber].dieselAmount += (t.dieselAmount || 0);
      statsMap[t.vehicleNumber].tons += (t.tons || 0);
      statsMap[t.vehicleNumber].profit += (t.rent - expenses);
      
      const tripDate = t.createdAt instanceof Timestamp ? t.createdAt.toDate() : new Date(t.createdAt);
      if (t.createdAt && (!statsMap[t.vehicleNumber].lastTrip || tripDate.getTime() > new Date(statsMap[t.vehicleNumber].lastTrip!).getTime())) {
        statsMap[t.vehicleNumber].lastTrip = tripDate.toISOString();
      }
    });

    return Object.entries(statsMap)
      .map(([vehicleNumber, data]) => ({ vehicleNumber, ...data }))
      .filter(s => s.trips > 0 || allVehicleNumbers.includes(s.vehicleNumber))
      .sort((a, b) => b.profit - a.profit);
  }, [trips, allVehicleNumbers]);

  const filteredTruckStats = useMemo(() => {
    return truckStats.filter(s => 
      s.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [truckStats, searchTerm]);

  // --- Actions ---
  const handleAddTrip = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const driverInfo = formData.get('driverInfo') as string;
    const [driverName, driverMobile] = driverInfo ? driverInfo.split('|') : ['', ''];

    const tripData: any = {
      date: formData.get('date') as string,
      vehicleNumber: formData.get('vehicleNumber') as string,
      driverName: driverName,
      driverMobile: driverMobile,
      tons: Number(formData.get('tons')),
      from: formData.get('from') as string,
      to: formData.get('to') as string,
      driverAdvance: Number(formData.get('driverAdvance')),
      dieselLiters: Number(formData.get('dieselLiters')),
      dieselAmount: Number(formData.get('dieselAmount')),
      rent: Number(formData.get('rent')),
      paymentMode: formData.get('paymentMode') as 'Cash' | 'UPI' | 'Other',
      loadingCharge: Number(formData.get('loadingCharge')),
      unloadingCharge: Number(formData.get('unloadingCharge')),
      localTax: Number(formData.get('localTax')),
      pcCharge: Number(formData.get('pcCharge')),
      otherExpense: Number(formData.get('otherExpense')),
      otherExpense1: Number(formData.get('otherExpense1')),
      otherExpense2: Number(formData.get('otherExpense2')),
      otherExpense3: Number(formData.get('otherExpense3')),
      driverCharge: Number(formData.get('driverCharge')),
      uid: user.uid,
      createdAt: editingTrip ? editingTrip.createdAt : serverTimestamp()
    };

    try {
      if (editingTrip) {
        await updateDoc(doc(db, 'trips', editingTrip.id), tripData);
        toast.success('பயணம் புதுப்பிக்கப்பட்டது!');
      } else {
        await addDoc(collection(db, 'trips'), tripData);
        toast.success('பயணம் பதிவு செய்யப்பட்டது!');
      }
      setIsAddingTrip(false);
      setEditingTrip(null);
    } catch (err) {
      handleFirestoreError(err, editingTrip ? OperationType.UPDATE : OperationType.CREATE, 'trips');
    }
  };

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const vehicleNumber = formData.get('vehicleNumber') as string;
    const name = formData.get('name') as string;

    if (vehicles.some(v => v.vehicleNumber === vehicleNumber)) {
      toast.error('வாகனம் ஏற்கனவே உள்ளது');
      return;
    }

    try {
      await addDoc(collection(db, 'vehicles'), {
        vehicleNumber,
        name,
        uid: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingVehicle(false);
      toast.success('வாகனம் சேர்க்கப்பட்டது');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm('இந்த பயணத்தை நீக்க விரும்புகிறீர்களா?')) return;
    try {
      await deleteDoc(doc(db, 'trips', id));
      toast.success('பயணம் நீக்கப்பட்டது');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trips/${id}`);
    }
  };

  const downloadCSV = () => {
    const headers = ['தேதி', 'வாகனம்', 'ஓட்டுநர்', 'மொபைல்', 'டன்', 'எங்கிருந்து', 'எங்கே', 'வாடகை', 'செலவுகள்', 'டீசல் (லி)', 'டீசல் (₹)', 'முறை'];
    const rows = filteredTrips.map(t => {
      const date = t.createdAt instanceof Timestamp ? t.createdAt.toDate() : new Date(t.createdAt);
      const totalExpenses = t.loadingCharge + t.unloadingCharge + t.localTax + t.pcCharge + t.otherExpense + (t.otherExpense1 || 0) + (t.otherExpense2 || 0) + (t.otherExpense3 || 0) + t.driverCharge;
      return [
        format(date, 'yyyy-MM-dd'),
        t.vehicleNumber,
        t.driverName || '-',
        t.driverMobile || '-',
        t.tons || 0,
        t.from,
        t.to,
        t.rent,
        totalExpenses,
        t.dieselLiters,
        t.dieselAmount || 0,
        t.paymentMode
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fleet_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('அறிக்கை பதிவிறக்கம் செய்யப்பட்டது');
  };

  const downloadTruckReportCSV = () => {
    const headers = ['வாகனம்', 'பயணங்கள்', 'வாடகை', 'செலவுகள்', 'டீசல்', 'லாபம்'];
    const rows = filteredTruckStats.map(t => [
      t.vehicleNumber,
      t.trips,
      t.rent,
      t.expenses,
      t.diesel,
      t.profit
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `truck_performance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('லாரி அறிக்கை பதிவிறக்கம் செய்யப்பட்டது');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Database className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">லாரி மேலாளர்</h1>
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Fleet Manager</p>
          <p className="text-gray-500 mb-8">உங்கள் லாரி மற்றும் பயணச் செலவுகளைப் பாதுகாப்பாக நிர்வகிக்கவும். <br/><span className="text-xs opacity-70">Manage your truck and trip expenses securely.</span></p>
          <button 
            onClick={handleLogin}
            className="w-full flex flex-col items-center justify-center gap-1 py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <div className="flex items-center gap-3">
              <LogIn className="w-5 h-5" />
              கூகுள் மூலம் உள்நுழையவும்
            </div>
            <span className="text-[10px] opacity-80 uppercase tracking-tighter">Sign in with Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight hidden sm:block leading-none">லாரி மேலாளர்</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Fleet Manager</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                {user.photoURL && <img src={user.photoURL} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />}
                <span className="text-sm font-medium">{user.displayName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="வெளியேறு"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'மொத்த வாடகை', subLabel: 'Total Rent', value: stats.totalRent, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'மொத்த செலவுகள்', subLabel: 'Total Expenses', value: stats.totalExpenses, icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'டீசல் (லிட்டர்)', subLabel: 'Diesel (Liters)', value: stats.totalDiesel, icon: Fuel, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'நிகர லாபம்', subLabel: 'Net Profit', value: stats.netProfit, icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-2xl", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall</span>
                </div>
                <div className="text-2xl font-bold">
                  {stat.subLabel === 'Diesel (Liters)' ? stat.value.toLocaleString() : `₹${stat.value.toLocaleString()}`}
                </div>
                <div className="mt-1">
                  <div className="text-sm font-bold text-gray-900">{stat.label}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.subLabel}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tabs & Global Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('trips')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center",
                  activeTab === 'trips' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <span>பயணப் பதிவுகள்</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-70">Trips Log</span>
              </button>
              <button 
                onClick={() => setActiveTab('expenses')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center",
                  activeTab === 'expenses' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <span>செலவுகள்</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-70">Expenses</span>
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex flex-col items-center",
                  activeTab === 'reports' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <span>லாரி அறிக்கைகள்</span>
                <span className="text-[9px] uppercase tracking-tighter opacity-70">Truck Reports</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button 
                onClick={activeTab === 'trips' ? downloadCSV : downloadTruckReportCSV}
                className="flex-1 md:flex-none flex flex-col items-center justify-center px-6 py-2 bg-white text-gray-700 rounded-2xl border border-gray-100 font-semibold hover:bg-gray-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">{activeTab === 'trips' ? 'பயணங்களை' : 'அறிக்கைகளை'} ஏற்றுமதி செய்</span>
                </div>
                <span className="text-[9px] uppercase tracking-tighter opacity-60">Export {activeTab === 'trips' ? 'Trips' : 'Reports'}</span>
              </button>
              <button 
                onClick={() => setIsAddingVehicle(true)}
                className="flex-1 md:flex-none flex flex-col items-center justify-center px-6 py-2 bg-white text-gray-700 rounded-2xl border border-gray-100 font-semibold hover:bg-gray-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">லாரி சேர்</span>
                </div>
                <span className="text-[9px] uppercase tracking-tighter opacity-60">Add Truck</span>
              </button>
              <button 
                onClick={() => { setEditingTrip(null); setIsAddingTrip(true); }}
                className="flex-1 md:flex-none flex flex-col items-center justify-center px-8 py-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  <span className="text-sm">புதிய பயணம்</span>
                </div>
                <span className="text-[9px] uppercase tracking-tighter opacity-80">New Trip</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder={activeTab === 'trips' ? "பயணங்கள், வழிகள் அல்லது லாரிகளைத் தேடுங்கள்... (Search trips, routes, or trucks...)" : "லாரி எண்ணைத் தேடுங்கள்... (Search truck number...)"}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {activeTab === 'trips' && (
              <div className="relative w-full md:w-auto">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select 
                  className="w-full md:w-auto pl-10 pr-8 py-3 bg-white rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm text-sm font-medium"
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                >
                  <option value="All">அனைத்து லாரிகள் (All Trucks)</option>
                  {allVehicleNumbers.map(vNum => (
                    <option key={vNum} value={vNum}>{vNum}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {activeTab === 'trips' ? (
            <>
              {/* Trips List */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-bottom border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>தேதி</div>
                          <div className="text-[9px] opacity-60">Date</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>வாகனம் மற்றும் ஓட்டுநர்</div>
                          <div className="text-[9px] opacity-60">Vehicle & Driver</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>வழி மற்றும் டன்</div>
                          <div className="text-[9px] opacity-60">Route & Tons</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          <div>வாடகை</div>
                          <div className="text-[9px] opacity-60">Rent</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          <div>செலவுகள்</div>
                          <div className="text-[9px] opacity-60">Expenses</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          <div>டீசல்</div>
                          <div className="text-[9px] opacity-60">Diesel</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          <div>முறை</div>
                          <div className="text-[9px] opacity-60">Mode</div>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          <div>நடவடிக்கைகள்</div>
                          <div className="text-[9px] opacity-60">Actions</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence mode="popLayout">
                        {filteredTrips.map((trip) => {
                          const tripExpenses = trip.loadingCharge + trip.unloadingCharge + trip.localTax + trip.pcCharge + trip.otherExpense + (trip.otherExpense1 || 0) + (trip.otherExpense2 || 0) + (trip.otherExpense3 || 0) + trip.driverCharge;
                          return (
                            <motion.tr 
                              key={trip.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="hover:bg-gray-50/50 transition-colors group"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {trip.createdAt ? format(trip.createdAt instanceof Timestamp ? trip.createdAt.toDate() : new Date(trip.createdAt), 'dd MMM yyyy') : 'Pending...'}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {trip.createdAt ? format(trip.createdAt instanceof Timestamp ? trip.createdAt.toDate() : new Date(trip.createdAt), 'hh:mm a') : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                    <Truck className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700">{trip.vehicleNumber}</span>
                                    <div className="flex flex-col text-[10px] text-gray-400 font-medium">
                                      <span>{trip.driverName || 'ஓட்டுநர் இல்லை'}</span>
                                      {trip.driverMobile && <span className="text-indigo-500">{trip.driverMobile}</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="font-medium text-gray-900">{trip.from}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                    <span className="font-medium text-gray-900">{trip.to}</span>
                                  </div>
                                  <span className="text-[10px] text-indigo-500 font-bold">{trip.tons || 0} Tons</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <span className="text-sm font-bold text-green-600">₹{trip.rent.toLocaleString()}</span>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <span className="text-sm font-medium text-red-500">₹{tripExpenses.toLocaleString()}</span>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-medium text-gray-600">{trip.dieselLiters} L</span>
                                  {trip.dieselAmount ? (
                                    <span className="text-[10px] text-blue-500 font-bold">₹{trip.dieselAmount.toLocaleString()}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  trip.paymentMode === 'Cash' ? "bg-amber-100 text-amber-700" :
                                  trip.paymentMode === 'UPI' ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-100 text-gray-700"
                                )}>
                                  {trip.paymentMode}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      setEditingTrip(trip);
                                      setIsAddingTrip(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="Edit Trip"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete Trip"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                      {filteredTrips.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">
                            <div>உங்கள் தேடலுக்குப் பொருத்தமான பயணங்கள் எதுவும் இல்லை.</div>
                            <div className="text-[10px] opacity-60 uppercase tracking-widest font-bold mt-1">No trips found matching your search.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'expenses' ? (
            <div className="space-y-8">
              {/* Expenses Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'டீசல் செலவு', value: stats.totalDieselAmount, icon: Fuel, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'ஓட்டுநர் கட்டணம்', value: trips.reduce((acc, t) => acc + t.driverCharge, 0), icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'ஓட்டுநர் முன்பணம்', value: stats.totalAdvance, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'ஏற்றும் கட்டணம்', value: trips.reduce((acc, t) => acc + t.loadingCharge, 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'இறக்கும் கட்டணம்', value: trips.reduce((acc, t) => acc + t.unloadingCharge, 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'வரி மற்றும் பிசி', value: trips.reduce((acc, t) => acc + t.localTax + t.pcCharge, 0), icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((exp, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4"
                  >
                    <div className={cn("p-4 rounded-2xl", exp.bg)}>
                      <exp.icon className={cn("w-6 h-6", exp.color)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        {exp.label}
                        <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">
                          {i === 0 ? 'Diesel Cost' : 
                           i === 1 ? 'Driver Charge' : 
                           i === 2 ? 'Driver Advance' : 
                           i === 3 ? 'Loading' : 
                           i === 4 ? 'Unloading' : 
                           'Tax & PC'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">₹{exp.value.toLocaleString()}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h3 className="text-lg font-bold">
                    சமீபத்திய செலவுகள்
                    <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">Recent Expenses</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                          பயணம் <span className="block text-[8px] opacity-60">Trip</span>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          டீசல் (₹) <span className="block text-[8px] opacity-60">Diesel</span>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          ஓட்டுநர் <span className="block text-[8px] opacity-60">Driver</span>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          முன்பணம் <span className="block text-[8px] opacity-60">Advance</span>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          இதர <span className="block text-[8px] opacity-60">Other</span>
                        </th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                          மொத்தம் <span className="block text-[8px] opacity-60">Total</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTrips.slice(0, 10).map((trip) => {
                        const total = (trip.dieselAmount || 0) + trip.driverCharge + trip.driverAdvance + trip.loadingCharge + trip.unloadingCharge + trip.localTax + trip.pcCharge + trip.otherExpense;
                        return (
                          <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-gray-900">{trip.vehicleNumber}</div>
                              <div className="text-[10px] text-gray-400">{trip.from} → {trip.to}</div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">₹{(trip.dieselAmount || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-sm font-medium">₹{trip.driverCharge.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-amber-600">₹{trip.driverAdvance.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-sm font-medium">₹{(trip.loadingCharge + trip.unloadingCharge + trip.localTax + trip.pcCharge + trip.otherExpense).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-red-600">₹{total.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Reports Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">
                    செயலில் உள்ள லாரிகள்
                    <span className="block text-[8px] opacity-60">Active Trucks</span>
                  </div>
                  <div className="text-3xl font-bold">{truckStats.filter(s => s.trips > 0).length}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    மொத்த டன்
                    <span className="block text-[8px] opacity-60">Total Tons</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalTons.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    சராசரி லாபம் / பயணம்
                    <span className="block text-[8px] opacity-60">Avg Profit / Trip</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    ₹{trips.length > 0 ? Math.round(stats.netProfit / trips.length).toLocaleString() : 0}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    மொத்த டீசல் செலவு
                    <span className="block text-[8px] opacity-60">Total Diesel Cost</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">₹{stats.totalDieselAmount.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTruckStats.map((truck, i) => (
                <motion.div 
                  key={truck.vehicleNumber}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">
                        {truck.vehicleNumber}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {truck.trips} பயணங்கள்
                          <span className="block text-[8px] opacity-60">Trips</span>
                        </div>
                        <div className="text-[10px] text-indigo-500 font-bold">
                          {truck.tons.toLocaleString()} டன்
                          <span className="block text-[8px] opacity-60">Tons</span>
                        </div>
                      </div>
                    </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        மொத்த வாடகை
                        <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Total Rent</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900">₹{truck.rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        மொத்த செலவுகள்
                        <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Total Expenses</span>
                      </span>
                      <span className="text-sm font-bold text-red-600">₹{truck.expenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        டீசல் செலவு
                        <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Diesel Cost</span>
                      </span>
                      <span className="text-sm font-bold text-blue-600">₹{truck.dieselAmount.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">
                        நிகர லாபம்
                        <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Net Profit</span>
                      </span>
                      <span className={cn(
                        "text-lg font-black",
                        truck.profit >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        ₹{truck.profit.toLocaleString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setFilterVehicle(truck.vehicleNumber);
                        setActiveTab('trips');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full mt-4 py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <div className="flex flex-col items-center">
                        <span>பயணங்களைக் காண்க</span>
                        <span className="text-[10px] opacity-60 uppercase tracking-widest font-bold">View Trips</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

        {/* Add Trip Modal */}
        <AnimatePresence>
          {isAddingTrip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingTrip(false)}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-600 text-white">
                  <h2 className="text-xl font-bold">
                    {editingTrip ? 'பயணத்தைத் திருத்து' : 'புதிய பயணம் பதிவு செய்'}
                    <span className="block text-[10px] opacity-80 uppercase tracking-widest font-bold">
                      {editingTrip ? 'Edit Trip' : 'Record New Trip'}
                    </span>
                  </h2>
                  <button onClick={() => { setIsAddingTrip(false); setEditingTrip(null); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddTrip} className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Route & Vehicle</h3>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          பயண தேதி <span className="text-[10px] text-gray-400 uppercase ml-1">Trip Date</span>
                        </label>
                        <input 
                          name="date" 
                          type="date" 
                          required 
                          defaultValue={editingTrip?.date || format(new Date(), 'yyyy-MM-dd')}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          வாகன எண் <span className="text-[10px] text-gray-400 uppercase ml-1">Vehicle Number</span>
                        </label>
                        <select 
                          name="vehicleNumber" 
                          required 
                          defaultValue={editingTrip?.vehicleNumber || ""}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">லாரியைத் தேர்ந்தெடுக்கவும் (Select Truck)</option>
                          {allVehicleNumbers.map(vNum => (
                            <option key={vNum} value={vNum}>{vNum}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          ஓட்டுநர் தேர்வு <span className="text-[10px] text-gray-400 uppercase ml-1">Driver Selection</span>
                        </label>
                        <select 
                          name="driverInfo" 
                          defaultValue={editingTrip ? `${editingTrip.driverName}|${editingTrip.driverMobile}` : ""}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">ஓட்டுநரைத் தேர்ந்தெடுக்கவும் (Select Driver)</option>
                          {DRIVERS.map(d => (
                            <option key={d.mobile} value={`${d.name}|${d.mobile}`}>
                              {d.name} ({d.mobile})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          எடை (டன்) <span className="text-[10px] text-gray-400 uppercase ml-1">Weight (Tons)</span>
                        </label>
                        <input 
                          name="tons" 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          value={formTons}
                          onChange={(e) => setFormTons(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            எங்கிருந்து <span className="text-[10px] text-gray-400 uppercase ml-1">From</span>
                          </label>
                          <select 
                            name="from" 
                            required 
                            defaultValue={editingTrip?.from || ""}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">கிளம்பும் இடத்தைத் தேர்ந்தெடுக்கவும் (Select Origin)</option>
                            {DEFAULT_PLACES.map(place => (
                              <option key={place} value={place}>{place}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            எங்கே <span className="text-[10px] text-gray-400 uppercase ml-1">To</span>
                          </label>
                          <input 
                            name="to" 
                            type="text" 
                            required 
                            placeholder="சேருமிடம் (Destination)" 
                            value={formTo}
                            onChange={(e) => setFormTo(e.target.value)}
                            list="destinations"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                          <datalist id="destinations">
                            {DESTINATIONS.map(d => (
                              <option key={d.place} value={d.place} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            வாடகைத் தொகை <span className="text-[10px] text-gray-400 uppercase ml-1">Rent Amount</span>
                          </label>
                          <input 
                            name="rent" 
                            type="number" 
                            required 
                            placeholder="0.00" 
                            value={formRent}
                            onChange={(e) => setFormRent(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            பணம் செலுத்தும் முறை <span className="text-[10px] text-gray-400 uppercase ml-1">Payment Mode</span>
                          </label>
                          <select 
                            name="paymentMode" 
                            required 
                            defaultValue={editingTrip?.paymentMode || "Cash"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Cash">ரொக்கம் (Cash)</option>
                            <option value="UPI">யுபிஐ (UPI)</option>
                            <option value="Other">இதர (Other)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            ஓட்டுநர் முன்பணம் <span className="text-[10px] text-gray-400 uppercase ml-1">Driver Advance</span>
                          </label>
                          <input 
                            name="driverAdvance" 
                            type="number" 
                            defaultValue={editingTrip?.driverAdvance || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            டீசல் (லிட்டர்) <span className="text-[10px] text-gray-400 uppercase ml-1">Diesel (Liters)</span>
                          </label>
                          <input 
                            name="dieselLiters" 
                            type="number" 
                            defaultValue={editingTrip?.dieselLiters || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        செலவுகள் <span className="ml-1">Expenses</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            ஏற்றும் கட்டணம் <span className="text-[10px] text-gray-400 uppercase ml-1">Loading</span>
                          </label>
                          <input 
                            name="loadingCharge" 
                            type="number" 
                            defaultValue={editingTrip?.loadingCharge || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            இறக்கும் கட்டணம் <span className="text-[10px] text-gray-400 uppercase ml-1">Unloading</span>
                          </label>
                          <input 
                            name="unloadingCharge" 
                            type="number" 
                            defaultValue={editingTrip?.unloadingCharge || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            உள்ளூர் வரி <span className="text-[10px] text-gray-400 uppercase ml-1">Local Tax</span>
                          </label>
                          <input 
                            name="localTax" 
                            type="number" 
                            defaultValue={editingTrip?.localTax || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            பிசி கட்டணம் <span className="text-[10px] text-gray-400 uppercase ml-1">PC Charge</span>
                          </label>
                          <input 
                            name="pcCharge" 
                            type="number" 
                            defaultValue={editingTrip?.pcCharge || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            ஓட்டுநர் கட்டணம் <span className="text-[10px] text-gray-400 uppercase ml-1">Driver Charge</span>
                          </label>
                          <input 
                            name="driverCharge" 
                            type="number" 
                            defaultValue={editingTrip?.driverCharge || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            இதர செலவுகள் <span className="text-[10px] text-gray-400 uppercase ml-1">Other Exp.</span>
                          </label>
                          <input 
                            name="otherExpense" 
                            type="number" 
                            defaultValue={editingTrip?.otherExpense || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            இதர செலவு 1 <span className="text-[10px] text-gray-400 uppercase ml-1">Other Exp. 1</span>
                          </label>
                          <input 
                            name="otherExpense1" 
                            type="number" 
                            defaultValue={editingTrip?.otherExpense1 || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            இதர செலவு 2 <span className="text-[10px] text-gray-400 uppercase ml-1">Other Exp. 2</span>
                          </label>
                          <input 
                            name="otherExpense2" 
                            type="number" 
                            defaultValue={editingTrip?.otherExpense2 || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            இதர செலவு 3 <span className="text-[10px] text-gray-400 uppercase ml-1">Other Exp. 3</span>
                          </label>
                          <input 
                            name="otherExpense3" 
                            type="number" 
                            defaultValue={editingTrip?.otherExpense3 || "0"}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          டீசல் தொகை (₹) <span className="text-[10px] text-gray-400 uppercase ml-1">Diesel Amount (₹)</span>
                        </label>
                        <input 
                          name="dieselAmount" 
                          type="number" 
                          defaultValue={editingTrip?.dieselAmount || "0"}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => { setIsAddingTrip(false); setEditingTrip(null); }}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                    >
                      ரத்து செய்
                      <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Cancel</span>
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                    >
                      {editingTrip ? 'பயணத்தைப் புதுப்பி' : 'பயணத்தைச் சேமி'}
                      <span className="block text-[10px] opacity-80 uppercase tracking-widest font-bold">
                        {editingTrip ? 'Update Trip' : 'Save Trip'}
                      </span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Vehicle Modal */}
        <AnimatePresence>
          {isAddingVehicle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingVehicle(false)}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-600 text-white">
                  <h2 className="text-xl font-bold">
                    புதிய லாரியைச் சேர்க்கவும்
                    <span className="block text-[10px] opacity-80 uppercase tracking-widest font-bold">Add Custom Truck</span>
                  </h2>
                  <button onClick={() => setIsAddingVehicle(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleAddVehicle} className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      வாகன எண் <span className="text-[10px] text-gray-400 uppercase ml-1">Vehicle Number</span>
                    </label>
                    <input 
                      name="vehicleNumber" 
                      type="text" 
                      required 
                      placeholder="எ.கா. TN-23-AB-1234 (e.g. TN-23-AB-1234)" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      உரிமையாளர்/ஓட்டுநர் பெயர் <span className="text-[10px] text-gray-400 uppercase ml-1">Owner/Driver Name</span>
                    </label>
                    <input 
                      name="name" 
                      type="text" 
                      required 
                      placeholder="பெயரை உள்ளிடவும் (Enter name)" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingVehicle(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-all"
                    >
                      ரத்து செய்
                      <span className="block text-[10px] opacity-60 uppercase tracking-widest font-bold">Cancel</span>
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                    >
                      லாரியைச் சேர்
                      <span className="block text-[10px] opacity-80 uppercase tracking-widest font-bold">Add Truck</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
