import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  
  params.set("format", "zip");
  
  const companyIds = searchParams.get("company_ids");
  if (companyIds) {
    params.set("company_ids", companyIds);
  }
  
  const reportTypes = searchParams.get("report_types");
  if (reportTypes) {
    params.set("report_types", reportTypes);
  }
  
  const reportId = searchParams.get("report_id");
  if (reportId) {
    params.set("report_id", reportId);
  }
  
  const reportDomain = searchParams.get("report_domain");
  if (reportDomain) {
    params.set("report_domain", reportDomain);
  }

  try {
    const response = await fetch(
      `${backendUrl}/company-reports?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/zip",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "No reports found for the specified filters" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch reports from backend" },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] 
      || `company_reports_${new Date().toISOString().split("T")[0]}.zip`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error fetching company reports:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 502 }
    );
  }
}
