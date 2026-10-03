"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

import PdfUploader from "../../components/upload/PdfUploader";
import UploadedFile from "../../components/upload/UploadedFile";
import OrderPageSelector from "../../components/upload/OrderPageSelector";
import ExtractedOrderDetails from "../../components/upload/ExtractedOrderDetails";
import OrderPagination from "../../components/upload/OrderPagination";
import DeletePageModal from "../../components/upload/DeletePageModal";

import {
  analyzeOrderPdf,
  saveOrders,
} from "../../lib/api";

export default function UploadOrdersPage() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  /*
   * Protect page
   */
  useEffect(() => {
    const token = sessionStorage.getItem("fab_art_token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  /*
   * Select PDF
   */
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setOrders([]);
    setCurrentPage(0);
    setError("");
    setSuccess("");
  };

  /*
   * Analyze PDF
   */
  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await analyzeOrderPdf(file);

      setOrders(data);
      setCurrentPage(0);

    } catch (error) {
      console.error(error);

      if (error.message.includes("Session expired")) {
        router.replace("/login");
        return;
      }

      setError(
        error.message || "Something went wrong while analyzing the PDF."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Edit current order
   */
  const handleOrderChange = (field, value) => {
    setOrders((previousOrders) =>
      previousOrders.map((order, index) =>
        index === currentPage
          ? {
              ...order,
              [field]: value,
            }
          : order
      )
    );
  };

  /*
   * Delete page
   */
  const handleDeletePage = (index) => {
    setPageToDelete(index);
    setDeleteModalOpen(true);
  };

  const confirmDeletePage = () => {
    if (pageToDelete === null) return;

    setOrders((previousOrders) =>
      previousOrders.filter(
        (_, index) => index !== pageToDelete
      )
    );

    setCurrentPage((previousPage) => {
      if (pageToDelete < previousPage) {
        return previousPage - 1;
      }

      if (pageToDelete === previousPage) {
        return Math.max(0, previousPage - 1);
      }

      return previousPage;
    });

    setPageToDelete(null);
    setDeleteModalOpen(false);
  };

  const cancelDeletePage = () => {
    setPageToDelete(null);
    setDeleteModalOpen(false);
  };

  /*
   * Save all remaining orders
   */
  const handleSaveOrders = async () => {
    if (orders.length === 0) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await saveOrders(orders);

      setSuccess(
        `${orders.length} ${
          orders.length === 1 ? "order has" : "orders have"
        } been saved successfully.`
      );

      setFile(null);
      setOrders([]);
      setCurrentPage(0);

    } catch (error) {
      console.error(error);

      if (error.message.includes("Session expired")) {
        router.replace("/login");
        return;
      }

      setError(
        error.message || "Failed to save orders."
      );
    } finally {
      setSaving(false);
    }
  };

  const currentOrder = orders[currentPage];

  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#1c1c1a] px-8 py-10">

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-[#77736c]">
            Orders
          </p>

          <h1 className="text-4xl font-light mt-3">
            Upload Orders
          </h1>

          <p className="text-[#77736c] mt-2">
            Upload handwritten order PDFs and review the extracted details
            before saving them.
          </p>
        </div>

        {/* Upload */}
        <div className="mt-10">

          <PdfUploader
            onFileSelect={handleFileSelect}
          />

          <UploadedFile
            file={file}
            onAnalyze={handleAnalyze}
            loading={loading}
          />

        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mt-5 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Extracted Orders */}
        {orders.length > 0 && (
          <section className="mt-12">

            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#77736c]">
                  Review Orders
                </p>

                <h2 className="text-2xl font-light mt-2">
                  {file?.name}
                </h2>
              </div>

              <p className="text-sm text-[#77736c]">
                {orders.length}{" "}
                {orders.length === 1 ? "page" : "pages"} remaining
              </p>

            </div>

            {/* Page Selector */}
            <OrderPageSelector
              orders={orders}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              onDelete={handleDeletePage}
            />

            {/* Current Order */}
            <ExtractedOrderDetails
              order={currentOrder}
              currentPage={currentPage}
              onChange={handleOrderChange}
            />

            {/* Pagination */}
            <OrderPagination
              currentPage={currentPage}
              totalPages={orders.length}
              setCurrentPage={setCurrentPage}
            />

            {/* Save */}
            <div className="mt-8 flex justify-end">

              <button
                onClick={handleSaveOrders}
                disabled={saving || orders.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1c1c1a] text-white text-sm font-medium hover:bg-[#30302d] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Saving Orders...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save {orders.length}{" "}
                    {orders.length === 1 ? "Order" : "Orders"}
                  </>
                )}
              </button>

            </div>

          </section>
        )}

      </div>

      <DeletePageModal
        isOpen={deleteModalOpen}
        pageNumber={
          pageToDelete !== null
            ? pageToDelete + 1
            : null
        }
        onCancel={cancelDeletePage}
        onConfirm={confirmDeletePage}
      />

    </main>
  );
}