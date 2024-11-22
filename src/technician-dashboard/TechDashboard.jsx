import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, functions } from '../../firebase/firebase';
import { collection, getDocs, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import TechStatCard from './TechStatCard';
import { httpsCallable } from 'firebase/functions';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress } from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import allIcon from '../assets/all.png';
import outstandingIcon from '../assets/outstanding.png';
import processingIcon from '../assets/processing.png';
import completedIcon from '../assets/completed.png';
import droppedIcon from '../assets/rejected.png';
import sendIcon from '../assets/send.png';
import './TechDashboard.css';

// Import Material Icons
import DoneIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';
import ChatIcon from '@mui/icons-material/Chat';

const TechDashboard = ({ handleReplyClick }) => {
    const [technicianId, setTechnicianId] = useState(null);
    const [earnings, setEarnings] = useState(0);
    const [adPosters, setAdPosters] = useState([]);
    const [ratings, setRatings] = useState(0);
    const [stats, setStats] = useState({
        totalEnquiries: 0,
        outstandingCount: 0,
        inProcessCount: 0,
        completedCount: 0,
        droppedCount: 0,
    });
    const [modifiedData, setModifiedData] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
    const [timeSlot, setTimeSlot] = useState(null);
    const [approxTime, setApproxTime] = useState('');
    const [budget, setBudget] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        const initializeDashboard = async (user) => {
            const storedTechnicianData = localStorage.getItem('technicianData');
            if (storedTechnicianData) {
                const parsedData = JSON.parse(storedTechnicianData);
                setTechnicianId(parsedData.documentId);
                setEarnings(parsedData.totalEarnings || 0);
                fetchEnquiries(parsedData.documentId);
                fetchEarnings(parsedData.documentId);
                setLoading(false);
            } else if (user) {
                fetchTechnicianDataByEmail(user.email);
            } else {
                setLoading(false);
            }
        };

        if (user) {
            initializeDashboard(user);
        } else {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    initializeDashboard(user);
                } else {
                    setLoading(false);
                }
            });

            return () => unsubscribe();
        }
    }, []);

    const fetchTechnicianDataByEmail = async (email) => {
        setLoading(true);
        try {
            const techniciansCollectionRef = collection(db, 'technicians');
            const q = query(techniciansCollectionRef, where('email', '==', email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const technicianData = { documentId: doc.id, ...doc.data() };

                localStorage.setItem('technicianData', JSON.stringify(technicianData));
                setTechnicianId(technicianData.documentId);
                setEarnings(technicianData.totalEarnings || 0);
                fetchEnquiries(technicianData.documentId);
                fetchEarnings(technicianData.documentId);
            }
        } catch (error) {
            console.error("Error fetching technician data by email:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEnquiries = (technicianId) => {
        setLoading(true);
        const q = query(collection(db, 'response_modified'), where('assignedTechnicianId', '==', technicianId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedData = [];
            querySnapshot.forEach((docSnapshot) => {
                fetchedData.push({ ...docSnapshot.data(), id: docSnapshot.id });
            });
            setModifiedData(fetchedData);
            calculateStats(fetchedData);
            setLoading(false);
        });
        return unsubscribe;
    };

    const calculateStats = (data) => {
        const totalEnquiries = data.length;
        const outstandingCount = data.filter(enquiry => enquiry.status === 'new' || enquiry.status === 'Pending').length;
        const inProcessCount = data.filter(enquiry => enquiry.status === 'In_process').length;
        const completedCount = data.filter(enquiry => enquiry.status === 'Completed').length;
        const droppedCount = data.filter(enquiry => enquiry.status === 'Dropped').length;

        setStats({
            totalEnquiries,
            outstandingCount,
            inProcessCount,
            completedCount,
            droppedCount,
        });
    };

    const fetchEarnings = async (technicianId) => {
        try {
            const docRef = doc(db, 'technicians', technicianId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setEarnings(docSnap.data().totalEarnings || 0);
            }
        } catch (error) {
            console.error("Error fetching earnings:", error);
        }
    };

    const fetchAdPosters = async () => {
        try {
            const adCollectionRef = collection(db, 'ad');
            const adSnapshot = await getDocs(adCollectionRef);
            const adUrls = adSnapshot.docs.map(doc => doc.data().url);
            setAdPosters(adUrls);
        } catch (error) {
            console.error("Error fetching ad posters:", error);
        }
    };

    useEffect(() => {
        fetchAdPosters();
    }, []);

    const handleAccept = (enquiryId) => {
        setSelectedEnquiryId(enquiryId);
        setOpenDialog(true);
    };

    const handleReject = async (enquiryId) => {
        await updateDoc(doc(db, 'response_modified', enquiryId), { status: 'Dropped' });
        await addDoc(collection(db, 'technician_response'), {
            enquiryId,
            status: 'Dropped',
            technicianId,
            timestamp: new Date(),
        });

        const sendNotification = httpsCallable(functions, 'sendAcceptRejectNotificationToAdmin');
        await sendNotification({ technicianId, enquiryId, action: 'rejected' });
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
    };

    const handleDialogSubmit = async () => {
        setIsSubmitting(true);

        if (timeSlot && approxTime && budget && selectedEnquiryId) {
            const duration = `${parseFloat(approxTime)} hrs`;
            const totalHours = parseFloat(approxTime);
            const estimatedCost = totalHours * parseFloat(budget);
            const totalBillingCost = estimatedCost * 1.3;

            const data = {
                enquiryId: selectedEnquiryId,
                status: 'accepted',
                timeSlot: timeSlot.toString(),
                approxTime: duration,
                estimatedCost: `₹${estimatedCost.toFixed(2)}`,
                budgetPerHour: `${budget}`,
                totalBillingCost: `${totalBillingCost.toFixed(2)}`,
                technicianId,
                timestamp: new Date(),
            };

            try {
                await updateDoc(doc(db, 'response_modified', selectedEnquiryId), { status: 'In_process' });
                await addDoc(collection(db, 'technician_response'), data);

                const technicianDoc = await getDoc(doc(db, 'technicians', technicianId));
                let technicianName = 'Technician';
                if (technicianDoc.exists()) {
                    technicianName = technicianDoc.data().name;
                }

                const sendNotification = httpsCallable(functions, 'sendAcceptRejectNotificationToAdmin');
                await sendNotification({
                    technicianId,
                    technicianName,
                    enquiryId: selectedEnquiryId,
                    action: 'accepted',
                });

                await addDoc(collection(db, 'notifications'), {
                    userId: 'admin',
                    message: `Enquiry ${selectedEnquiryId} has been accepted by technician ${technicianName}.`,
                    status: 'unread',
                    timestamp: new Date(),
                });

                setOpenDialog(false);
                setTimeSlot(null);
                setApproxTime('');
                setBudget('');
                setEstimatedCost('');
            } catch (error) {
                console.error('Error submitting data:', error);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (approxTime && budget) {
            const totalHours = parseFloat(approxTime) || 0;
            setEstimatedCost(totalHours * parseFloat(budget || 0));
        }
    }, [approxTime, budget]);

    const getStatusButtonStyle = (status) => {
        switch (status) {
            case 'new':
                return { backgroundColor: '#007bff', color: '#fff' };
            case 'Pending':
                return { backgroundColor: '#FEC53D', color: '#fff' };
            case 'In_process':
                return { backgroundColor: '#FEC53D', color: '#fff' };
            case 'Completed':
                return { backgroundColor: '#28a745', color: '#fff' };
            case 'Dropped':
                return { backgroundColor: '#dc3545', color: '#fff' };
            default:
                return { backgroundColor: '#6c757d', color: '#fff' };
        }
    };

    const StarDisplay = ({ rating, count }) => {
        const stars = Array.from({ length: count }, (_, index) => {
            const starValue = index + 1;
            if (starValue <= rating) {
                return <span key={index} className="star-filled">★</span>;
            } else if (starValue === Math.ceil(rating) && !Number.isInteger(rating)) {
                return <span key={index} className="star-half-filled">★</span>;
            } else {
                return <span key={index} className="star-empty">★</span>;
            }
        });

        return (
            <div className="star-container">
                <div className="rating-circle">
                    <span>{rating.toFixed(1)}</span>
                </div>
                <div className="stars">{stars}</div>
            </div>
        );
    };

    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    const filteredData = modifiedData.filter((data) => data.status !== 'Completed' && data.status !== 'Dropped');

    return (
        <div>
            {technicianId ? (
                <>
                    <div className="stats-container">
                        <TechStatCard title="Total Enquiries" number={stats.totalEnquiries} icon={allIcon} />
                        <TechStatCard title="Outstanding" number={stats.outstandingCount} icon={outstandingIcon} />
                        <TechStatCard title="Processing" number={stats.inProcessCount} icon={processingIcon} />
                        <TechStatCard title="Completed" number={stats.completedCount} icon={completedIcon} />
                        <TechStatCard title="Dropped" number={stats.droppedCount} icon={droppedIcon} />
                    </div>
                    <div className="carousel-container">
                        <Slider {...settings}>
                            {adPosters.map((url, index) => (
                                <div key={index}>
                                    <img src={url} alt={`Ad Poster ${index + 1}`} className="ad-poster" />
                                </div>
                            ))}
                        </Slider>
                    </div>
                    <div className="table-chart-container">
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="th">Enquiry ID</th>
                                        <th className="th">Field of Category</th>
                                        <th className="th">Enquiry</th>
                                        <th className="th">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="no-data-td">
                                                No enquiries received yet
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredData
                                            .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
                                            .map((data, index) => (
                                                <tr key={index}>
                                                    <td className="td">{data.enquiryId}</td>
                                                    <td className="td">{data.fieldOfCategory}</td>
                                                    <td className="td">
                                                        {data.status === 'new' || data.status === 'Pending' ? (
                                                            <>
                                                                <button className="accept-button" onClick={() => handleAccept(data.id)}>
                                                                    <DoneIcon className="icon-only" /> 
                                                                    <span className="button-text">Accept</span>
                                                                </button>
                                                                <button className="reject-button" onClick={() => handleReject(data.id)}>
                                                                    <ClearIcon className="icon-only" />
                                                                    <span className="button-text">Reject</span>
                                                                </button>
                                                            </>
                                                        ) : data.status === 'In_process' ? (
                                                            <button className="reply-button" onClick={() => handleReplyClick(data.id)}>
                                                                <ChatIcon className="icon-only" />
                                                                <span className="button-text">Chat</span>
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                    
                                                    <td className="td">
                                                        <div className="status-container">
                                                            <span className={`status-text ${data.status === 'Pending' ? 'pending' : data.status === 'In_process' ? 'in-process' : data.status === 'Completed' ? 'completed' : 'dropped'}`}>
                                                                {data.status}
                                                            </span>
                                                            {data.status === 'Pending' && <div className="led-box led-blue"></div>}
                                                            {data.status === 'In_process' && <div className="led-box led-yellow"></div>}
                                                            {data.status === 'Completed' && <div className="led-box led-green"></div>}
                                                            {data.status === 'Dropped' && <div className="led-box led-red"></div>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="sidebar">
                            <div className="ratings-container">
                                <h1 className="rating-header">Ratings</h1>
                                <div className="rating-item">
                                    <StarDisplay rating={ratings} count={5} />
                                </div>
                            </div>
                            <div className="earnings-container">
                                <h1 className="earnings-header">Your Earnings</h1>
                                <div className="earnings-display">
                                    <h1>₹{earnings.toFixed(2)}</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="no-data-container">
                    <p>No data available. Please check back later.</p>
                </div>
            )}
            <Dialog open={openDialog} onClose={handleDialogClose}>
                <DialogTitle>Accept Enquiry</DialogTitle>
                <DialogContent>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DateTimePicker
                            label="Time Slot"
                            value={timeSlot}
                            onChange={(newValue) => setTimeSlot(newValue)}
                            slots={{
                                textField: (props) => (
                                    <TextField
                                        {...props}
                                        fullWidth
                                        margin="normal"
                                        className="date-time-picker-text-field"
                                    />
                                ),
                            }}
                        />
                    </LocalizationProvider>
                    <TextField
                        label="Approx Time (Hours)"
                        type="text"
                        fullWidth
                        margin="normal"
                        value={approxTime ?? ''}
                        onChange={(e) => setApproxTime(e.target.value)}
                    />
                    <TextField
                        label="Budget per Hour"
                        type="number"
                        fullWidth
                        margin="normal"
                        value={budget ?? ''}
                        onChange={(e) => setBudget(e.target.value)}
                    />
                    <TextField
                        label="Estimated Cost"
                        type="text"
                        fullWidth
                        margin="normal"
                        value={estimatedCost ?? ''}
                        disabled
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button onClick={handleDialogSubmit} color="primary" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default TechDashboard;
