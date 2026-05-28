declare module 'html2pdf.js' {
    interface Html2CanvasOptions {
        scale?: number;
        useCORS?: boolean;
        logging?: boolean;
        letterRendering?: boolean;
        backgroundColor?: string;
        [key: string]: unknown;
    }

    interface JsPDFOptions {
        unit?: string;
        format?: string | string[];
        orientation?: string;
        compress?: boolean;
        [key: string]: unknown;
    }

    interface Options {
        margin?: number | [number, number] | [number, number, number, number];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: Html2CanvasOptions;
        jsPDF?: JsPDFOptions;
        pagebreak?: { mode?: string | string[] };
    }

    interface Html2Pdf {
        set(options: Options): Html2Pdf;
        from(element: HTMLElement | string): Html2Pdf;
        save(): Promise<void>;
        output(type?: string, options?: unknown): unknown;
    }

    function html2pdf(): Html2Pdf;
    export default html2pdf;
}
