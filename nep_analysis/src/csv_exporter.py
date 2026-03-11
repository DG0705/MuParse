import pandas as pd

def export_csv(data, output_path):

    df = pd.DataFrame(data)

    df.to_csv(output_path, index=False)

    print("\nCSV saved to:", output_path)