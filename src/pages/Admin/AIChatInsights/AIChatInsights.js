import React, { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  SearchX,
  Timer,
} from "lucide-react";
import StatCard from "../../../components/Admin/StatCard";
import {
  fetchChatInsights,
  fetchChatLogs,
} from "../../../api/chatInsightsAPI";
import "./AIChatInsights.scss";

const formatTimestamp = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN", { hour12: false });
};

const formatLatency = (value) => {
  if (value == null) return "—";
  return `${value} ms`;
};

const statusBadgeClass = (status) => {
  if (!status) return "ai-insights__badge";
  const s = String(status).toLowerCase();
  if (s.includes("error") || s.includes("fail")) {
    return "ai-insights__badge ai-insights__badge--error";
  }
  if (s.includes("fallback") || s.includes("no_result") || s.includes("missing")) {
    return "ai-insights__badge ai-insights__badge--fallback";
  }
  return "ai-insights__badge";
};

const DistributionTable = ({ title, data, labelHeader = "Giá trị" }) => {
  const entries = Object.entries(data || {});
  return (
    <div className="ai-insights__card">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="ai-insights__empty">Chưa có dữ liệu.</p>
      ) : (
        <table className="ai-insights__table">
          <thead>
            <tr>
              <th>{labelHeader}</th>
              <th style={{ width: 80, textAlign: "right" }}>Số lượt</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, count]) => (
              <tr key={key}>
                <td>{key}</td>
                <td style={{ textAlign: "right" }}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const AIChatInsights = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [logs, setLogs] = useState([]);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [insightsResp, logsResp] = await Promise.all([
        fetchChatInsights({ limit: 200 }),
        fetchChatLogs({ limit: 50 }),
      ]);
      setInsights(insightsResp);
      setLogs(logsResp.logs);
    } catch (err) {
      console.error("AI insights load error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải dữ liệu phân tích chatbot."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  if (loading) {
    return (
      <div className="ai-insights">
        <p>Đang tải dữ liệu AI insights...</p>
      </div>
    );
  }

  const data = insights || {};
  const noData = (data.total_chats ?? 0) === 0 && logs.length === 0;

  return (
    <div className="ai-insights">
      <div className="ai-insights__header">
        <div>
          <h1 className="ai-insights__title">AI Chat Insights</h1>
          <p className="ai-insights__subtitle">
            Phân tích từ log JSONL của chatbot. Không lưu nội dung câu hỏi gốc.
          </p>
        </div>
        <button
          type="button"
          className="ai-insights__refresh"
          onClick={() => loadAll(true)}
          disabled={refreshing}
        >
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {error && <div className="ai-insights__error">{error}</div>}

      {noData && !error ? (
        <div className="ai-insights__card">
          <p className="ai-insights__empty">
            Chưa có log chatbot nào. Hãy thử trò chuyện với chatbot rồi quay lại
            trang này.
          </p>
        </div>
      ) : (
        <>
          <div className="ai-insights__stats">
            <StatCard
              variant="primary"
              icon={<MessageSquare />}
              title="Tổng lượt chat"
              value={data.total_chats ?? 0}
            />
            <StatCard
              variant="secondary"
              icon={<AlertTriangle />}
              title="Fallback"
              value={data.fallback_count ?? 0}
              suffix={
                data.fallback_rate != null
                  ? ` (${Math.round((data.fallback_rate || 0) * 100)}%)`
                  : ""
              }
            />
            <StatCard
              variant="tertiary"
              icon={<HelpCircle />}
              title="Cơ hội FAQ"
              value={data.faq_opportunities_count ?? 0}
            />
            <StatCard
              variant="primary"
              icon={<SearchX />}
              title="Không có kết quả"
              value={data.no_result_searches ?? 0}
            />
            <StatCard
              variant="secondary"
              icon={<Timer />}
              title="Độ trễ TB"
              value={data.avg_latency_ms ?? "—"}
              suffix={data.avg_latency_ms != null ? " ms" : ""}
            />
          </div>

          <div className="ai-insights__grid">
            <DistributionTable
              title="Phân bố trạng thái"
              data={data.status_distribution}
              labelHeader="Trạng thái"
            />
            <DistributionTable
              title="Ý định câu hỏi"
              data={data.query_intent_distribution}
              labelHeader="Intent"
            />
            <DistributionTable
              title="Loại nội dung"
              data={data.content_category_distribution}
              labelHeader="Category"
            />
            <div className="ai-insights__card">
              <h3>Điểm đến phổ biến</h3>
              {(data.top_destinations || []).length === 0 ? (
                <p className="ai-insights__empty">Chưa có dữ liệu.</p>
              ) : (
                <table className="ai-insights__table">
                  <thead>
                    <tr>
                      <th>Điểm đến</th>
                      <th style={{ width: 80, textAlign: "right" }}>Số lượt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_destinations.map((row) => (
                      <tr key={row.destination}>
                        <td>{row.destination}</td>
                        <td style={{ textAlign: "right" }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="ai-insights__card">
            <h3>Sự kiện gần đây ({logs.length})</h3>
            {logs.length === 0 ? (
              <p className="ai-insights__empty">Chưa có sự kiện nào.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="ai-insights__table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Final</th>
                      <th>Location</th>
                      <th>Intent</th>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>Tours</th>
                      <th>Fallback</th>
                      <th style={{ textAlign: "right" }}>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...logs].reverse().map((log, idx) => (
                      <tr key={`${log.timestamp || idx}_${idx}`}>
                        <td>{formatTimestamp(log.timestamp)}</td>
                        <td>{log.user_id || "—"}</td>
                        <td>
                          <span className={statusBadgeClass(log.status)}>
                            {log.status || "—"}
                          </span>
                        </td>
                        <td>{log.final_status || "—"}</td>
                        <td>{log.location || "—"}</td>
                        <td>{log.query_intent || "—"}</td>
                        <td>{log.content_category || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          {log.tours_count ?? 0}
                        </td>
                        <td>
                          {log.fallback_used ? (
                            <span className="ai-insights__badge ai-insights__badge--fallback">
                              Có
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatLatency(log.latency_ms)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatInsights;
