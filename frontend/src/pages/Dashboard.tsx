import React, { useEffect, useState } from 'react';
import { interviewService } from '../services/interview.service';
import { authService } from '../services/auth.service';
import { 
  Users, 
  Link as LinkIcon, 
  CheckCircle, 
  FileText,
  LogOut,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const data = await interviewService.getInterviews();
      setInterviews(data);
    } catch (error) {
      console.error('Failed to fetch interviews', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt('Enter Candidate Name:');
    if (!name) return;

    setIsUploading(true);
    try {
      await interviewService.uploadCv(file, name);
      fetchInterviews();
    } catch (error) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEvaluate = async (id: string) => {
    try {
      await interviewService.evaluate(id);
      fetchInterviews();
    } catch (error) {
      alert('Evaluation failed. Make sure the interview has messages.');
    }
  };

  const copyInvite = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Invite link copied!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">IntelliView AI</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center space-x-3 p-3 bg-primary-50 text-primary-700 rounded-lg">
            <Users size={20} />
            <span className="font-medium">Interviews</span>
          </a>
          {/* Add more nav items here */}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => { authService.logout(); window.location.href = '/login'; }}
            className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-50 rounded-lg w-full"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Recruiter Dashboard</h2>
            <p className="text-gray-500">Welcome back, {user?.name}</p>
          </div>
          <label className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-700 transition">
            <Plus size={20} />
            <span>New Interview</span>
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf" />
          </label>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-400 mb-2">Total Interviews</div>
            <div className="text-3xl font-bold">{interviews.length}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-400 mb-2">Active Sessions</div>
            <div className="text-3xl font-bold text-blue-600">
              {interviews.filter(i => i.status === 'active').length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-400 mb-2">Completed</div>
            <div className="text-3xl font-bold text-green-600">
              {interviews.filter(i => i.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Interviews List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Candidate</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Created</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">Loading...</td></tr>
              ) : interviews.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">No interviews found. Upload a CV to start.</td></tr>
              ) : (
                interviews.map((interview: any) => (
                  <tr key={interview.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{interview.candidate_name}</div>
                      <div className="text-xs text-gray-400">{interview.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        interview.status === 'completed' ? 'bg-green-100 text-green-700' :
                        interview.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        {interview.access_token && (
                          <button 
                            onClick={() => copyInvite(`${window.location.origin}/interview/${interview.access_token}`)}
                            className="p-2 text-gray-400 hover:text-primary-600 transition"
                            title="Copy Invite Link"
                          >
                            <LinkIcon size={18} />
                          </button>
                        )}
                        {interview.status !== 'completed' && (
                          <button 
                            onClick={() => handleEvaluate(interview.id)}
                            className="p-2 text-gray-400 hover:text-green-600 transition"
                            title="Generate Report"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {interview.report_url && (
                          <a 
                            href={interviewService.getReportUrl(interview.report_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-gray-400 hover:text-red-600 transition"
                            title="Download PDF"
                          >
                            <FileText size={18} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {isUploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="font-medium">Analyzing CV with AI...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
