import os
import re

file_path = r'c:\Users\USER\Desktop\hidayah\frontend\src\pages\AdminDashboard.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Imports
if 'import { jsPDF }' not in content:
    content = 'import { jsPDF } from "jspdf";\nimport "jspdf-autotable";\n' + content

# 2. Update Header Branding
content = content.replace(
    '<div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-xl">H</div>',
    '<img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />'
)
content = content.replace(
    '<span className="font-display font-black text-slate-800 tracking-tight">Hidayah Admin</span>',
    '<div className="flex flex-col -gap-1"><span className="font-display font-black text-slate-800 tracking-tighter leading-none">HIDAYAH International</span><span className="text-[7px] font-black tracking-widest text-secondary uppercase">Tutor Platform</span></div>'
)

# 3. Add handleDownloadReceipt function
# We'll insert it before the last closing brace of the component if possible, 
# or after other handlers. Let's find handles...
receipt_func = r'''
    const handleDownloadReceipt = (data, type = 'payment') => {
        const doc = new jsPDF();
        
        // Brand Header
        doc.setFillColor(15, 23, 42); // Navy
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("HIDAYAH INTERNATIONAL", 105, 18, { align: "center" });
        doc.setFontSize(10);
        doc.text("TUTOR PLATFORM | ISLAMIC & WESTERN EDUCATION", 105, 28, { align: "center" });
        
        // Receipt Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(16);
        doc.text("OFFICIAL TRANSACTION RECEIPT", 20, 55);
        
        doc.setFontSize(10);
        doc.text(`Receipt Date: ${new Date().toLocaleString()}`, 20, 65);
        doc.text(`Reference ID: #${data.ref || data.reference || data.id}`, 20, 72);
        
        // Grid Data
        const rows = [
            ["Transaction For", data.student || data.user_name || "Platform User"],
            ["Email Address", data.email || data.user_email || "N/A"],
            ["Activity Type", (data.type || data.method || "Payment").replace('_', ' ').toUpperCase()],
            ["Amount Paid", `NGN ${parseFloat(data.amount || 0).toLocaleString()}`],
            ["Transaction Status", (data.status || "COMPLETED").toUpperCase()],
            ["Description", data.description || "Course Enrollment / Wallet Activity"]
        ];
        
        doc.autoTable({
            startY: 85,
            head: [['Description', 'Detail']],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }, // Emerald
            styles: { fontSize: 10, cellPadding: 5 }
        });
        
        // Footer
        const finalY = doc.lastAutoTable.finalY + 30;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Thank you for choosing Hidayah International.", 105, finalY, { align: "center" });
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("This is a computer-generated receipt and requires no signature.", 105, finalY + 10, { align: "center" });
        
        doc.save(`Hidayah_Receipt_${data.ref || data.id}.pdf`);
    };
'''

# Insert after fetchData or similar
if 'const handleDownloadReceipt' not in content:
    content = content.replace('const fetchData = async () => {', receipt_func + '\n    const fetchData = async () => {')

# 4. Add Download Buttons to Tables
# Audit Trail Table
audit_row_pattern = re.compile(r'(<td className="py-4 px-6 text-\[10px\] font-bold text-slate-500 italic">#{p.ref}</td>)')
content = audit_row_pattern.sub(r'\1\n                                                                        <td className="py-4 px-6 text-right">\n                                                                            <button onClick={() => handleDownloadReceipt(p, "payment")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Download Receipt">\n                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\n                                                                            </button>\n                                                                        </td>', content)

# update Audit Trail header to match columns
content = content.replace(
    '<th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Ref</th>',
    '<th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Ref</th>\n                                                                    <th className="py-3 px-6 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Receipt</th>'
)

# Wallet Transactions Table
wallet_row_pattern = re.compile(r'(REF: {t.reference}</div>})')
wallet_btn = r'\1\n                                                                            <button onClick={() => handleDownloadReceipt(t, "transaction")} className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-all">\n                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\n                                                                                Get Receipt\n                                                                            </button>'
content = wallet_row_pattern.sub(wallet_btn, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated AdminDashboard with branding and receipt download.")
